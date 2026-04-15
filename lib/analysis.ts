import { Buffer } from 'buffer';
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
  uploadBytes,
  UploadTask,
} from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { storage, functions } from '@/lib/firebase';
import type { AnalysisFeedback } from '@/types';
import * as FileSystem from 'expo-file-system';

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
  const compressedUri = request.videoUri;

  // Phase 2: Upload to Firebase Storage
  const timestamp = Date.now();
  const storagePath = `videos/${uid}/${timestamp}.mp4`;
  const storageRef = ref(storage, storagePath);

  onProgress?.({
    phase: 'uploading',
    progress: 35,
    message: '영상을 업로드하고 있어요...',
  });

  // Read video file as base64 using expo-file-system (more reliable on iOS than fetch blob)
  const base64Data = await FileSystem.readAsStringAsync(compressedUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const byteArray = new Uint8Array(Buffer.from(base64Data, 'base64'));

  // Upload with retry logic for iOS storage/unknown errors
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const uploadTask: UploadTask = uploadBytesResumable(
          storageRef,
          byteArray,
          { contentType: 'video/mp4' },
        );

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const uploadPercent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const totalProgress = 35 + (uploadPercent * 0.35);
            onProgress?.({
              phase: 'uploading',
              progress: Math.round(totalProgress),
              message: `영상 업로드 중... ${Math.round(uploadPercent)}%`,
            });
          },
          (error) => {
            reject(error);
          },
          () => {
            resolve();
          },
        );
      });
      break; // Upload succeeded, exit retry loop
    } catch (uploadError: any) {
      if (attempt < maxRetries && uploadError?.code === 'storage/unknown') {
        // Retry after a short delay for intermittent iOS errors
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw new Error(`업로드 실패: ${uploadError.message || uploadError}`);
    }
  }

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

  // Must match Cloud Function's formatDateKST() output: "YYYY-MM-DD"
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;

  // If the date doesn't match today, the count is effectively 0
  if (dailyUsage.date !== today) return true;

  return dailyUsage.count < limit;
}
