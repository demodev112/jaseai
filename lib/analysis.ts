/**
 * Analysis Service
 *
 * Client-side service that handles:
 * 1. Video compression (via react-native-compressor in production)
 * 2. Upload to Firebase Storage
 * 3. Call analyzeVideo Cloud Function
 * 4. Return analysis result
 */

import {
  ref,
  uploadBytesResumable,
  UploadTask,
} from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { storage, functions } from '@/lib/firebase';
import type { AnalysisFeedback } from '@/types';
import { Video } from 'react-native-compressor';

// ─── Types ──────────────────────────────────────────────
export interface AnalysisRequest {
  exerciseName: string;
  videoUri: string;
  source: 'standalone' | 'routine';
  routineId?: string;
}

export interface AnalysisResult {
  analysisId: string;
  feedback: AnalysisFeedback;
}

export interface UploadProgress {
  phase: 'compressing' | 'uploading' | 'analyzing';
  progress: number; // 0-100
  message: string;
}

type ProgressCallback = (progress: UploadProgress) => void;

// ─── Main Analysis Function ─────────────────────────────
export async function submitAnalysis(
  uid: string,
  request: AnalysisRequest,
  onProgress?: ProgressCallback,
): Promise<AnalysisResult> {
  // Phase 1: Compress video
  onProgress?.({
    phase: 'compressing',
    progress: 10,
    message: '영상을 최적화하고 있어요...',
  });

  // Compress video to reduce upload size and Cloud Function memory usage
  let compressedUri: string;
  try {
    compressedUri = await Video.compress(request.videoUri, {
      compressionMethod: 'auto',
      maxSize: 720,
    });
  } catch (compressError) {
    console.warn('Video compression failed, using original:', compressError);
    compressedUri = request.videoUri;
  }

  onProgress?.({
    phase: 'compressing',
    progress: 30,
    message: '영상 최적화 완료!',
  });

  // Phase 2: Upload to Firebase Storage
  const timestamp = Date.now();
  const storagePath = `videos/${uid}/${timestamp}.mp4`;
  const storageRef = ref(storage, storagePath);

  onProgress?.({
    phase: 'uploading',
    progress: 35,
    message: '영상을 업로드하고 있어요...',
  });

  // Fetch the video file as a blob
  const response = await fetch(compressedUri);
  const blob = await response.blob();

  // Upload with progress tracking
  await new Promise<void>((resolve, reject) => {
    const uploadTask: UploadTask = uploadBytesResumable(storageRef, blob);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const uploadPercent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        // Map upload progress to 35-70% of total progress
        const totalProgress = 35 + (uploadPercent * 0.35);
        onProgress?.({
          phase: 'uploading',
          progress: Math.round(totalProgress),
          message: `영상 업로드 중... ${Math.round(uploadPercent)}%`,
        });
      },
      (error) => {
        reject(new Error(`업로드 실패: ${error.message}`));
      },
      () => {
        resolve();
      },
    );
  });

  onProgress?.({
    phase: 'uploading',
    progress: 70,
    message: '업로드 완료!',
  });

  // Phase 3: Call Cloud Function for AI analysis
  onProgress?.({
    phase: 'analyzing',
    progress: 75,
    message: 'AI가 자세를 분석하고 있어요...',
  });

  const analyzeVideoFn = httpsCallable<
    {
      exerciseName: string;
      videoStoragePath: string;
      source: string;
      routineId?: string;
    },
    AnalysisResult
  >(functions, 'analyzeVideo', { timeout: 120_000 });

  const result = await analyzeVideoFn({
    exerciseName: request.exerciseName,
    videoStoragePath: storagePath,
    source: request.source,
    routineId: request.routineId,
  });

  onProgress?.({
    phase: 'analyzing',
    progress: 100,
    message: '분석 완료!',
  });

  return result.data;
}

// ─── Daily Limit Check (client-side) ────────────────────
export function getDailyLimit(subscriptionStatus: string): number {
  const limits: Record<string, number> = {
    trial: 10,
    active: 20,
    none: 0,
    expired: 0,
  };
  return limits[subscriptionStatus] || 0;
}

export function isWithinDailyLimit(
  dailyUsage: { date: string; count: number },
  subscriptionStatus: string,
): boolean {
  const limit = getDailyLimit(subscriptionStatus);
  if (limit === 0) return false;

  const today = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // If the date doesn't match today, the count is effectively 0
  if (dailyUsage.date !== today) return true;

  return dailyUsage.count < limit;
}
