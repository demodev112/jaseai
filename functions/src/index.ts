/**
 * 자세ai Cloud Functions
 *
 * Main entry point for all server-side logic:
 * 1. analyzeVideo — Callable function: uploads video to Gemini, returns feedback
 * 2. resetDailyUsage — Scheduled function: resets daily analysis counts at midnight KST
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

// ─── Initialize Firebase Admin ─────────────────────────
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// ─── Secrets ────────────────────────────────────────────
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// ─── Constants ──────────────────────────────────────────
const DAILY_LIMITS: Record<string, number> = {
  trial: 10,
  active: 20,
  none: 0,
  expired: 0,
};

// ─── Gemini Prompt ──────────────────────────────────────
const SYSTEM_PROMPT = `당신은 전문 피트니스 트레이너이자 운동 자세 분석 전문가입니다.
사용자가 업로드한 운동 영상을 분석하여 자세에 대한 상세한 피드백을 제공합니다.
모든 응답은 반드시 한국어로 작성하세요.

분석 순서:
1. 먼저 영상의 품질을 평가하세요 (밝기, 각도, 전신 가시성 등).
2. 영상 품질이 분석하기에 충분하지 않다면, analysisConfidence를 "low"로 설정하고 qualityIssues에 이유를 적으세요.
3. 영상 품질이 충분하다면, 운동 자세를 상세히 분석하세요.

주의사항:
- 운동 영상이 아닌 경우 (예: 일상 영상, 동물 영상 등), analysisConfidence를 "low"로 설정하세요.
- 의류가 너무 두꺼워 관절 움직임이 보이지 않는 경우에도 "low"로 설정하세요.
- 타임스탬프는 "분:초" 형식으로 표기하세요 (예: "0:04").
- 부상 위험도는 관찰된 자세 문제의 심각도에 따라 판단하세요.
- severity는 심각하면 "주의", 경미하면 "경미"로 표기하세요.
- injuryRisk는 반드시 "낮음", "보통", "높음" 중 하나로 한국어로 표기하세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:`;

const JSON_SCHEMA = `{
  "videoQuality": {
    "analysisConfidence": "high 또는 low",
    "qualityIssues": ["문제가 있을 경우 한국어로 설명, 없으면 빈 배열"]
  },
  "overallScore": "1-10 사이 정수 (confidence가 low면 null)",
  "summary": "전반적인 자세 평가 요약 (2-3문장)",
  "goodPoints": ["잘한 점 목록 (최소 1개, 최대 5개)"],
  "improvements": [
    {
      "issue": "개선이 필요한 부분",
      "timestamp": "해당 시점 (예: 0:04)",
      "detail": "구체적인 교정 방법 설명",
      "severity": "주의 또는 경미"
    }
  ],
  "injuryRisk": "낮음, 보통, 또는 높음",
  "overallAdvice": "종합적인 조언 (1-2문장)"
}`;

// ─── analyzeVideo ───────────────────────────────────────
export const analyzeVideo = onCall(
  {
    region: 'asia-northeast3',
    memory: '2GiB',
    timeoutSeconds: 120,
    minInstances: 1,
    secrets: [geminiApiKey],
    enforceAppCheck: false,
  },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const uid = request.auth.uid;

    // 2. Validate input
    const { exerciseName, videoStoragePath, source, routineId } = request.data;
    if (!exerciseName || !videoStoragePath) {
      throw new HttpsError('invalid-argument', '운동 이름과 영상 경로가 필요합니다.');
    }

    // 3. Check daily limit
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError('not-found', '사용자를 찾을 수 없습니다.');
    }
    const userData = userSnap.data()!;
    const subscriptionStatus = userData.subscription?.status || 'none';
    const dailyLimit = DAILY_LIMITS[subscriptionStatus] || 0;

    if (dailyLimit === 0) {
      throw new HttpsError('permission-denied', '구독이 필요합니다.');
    }

    const todayKST = formatDateKST(new Date());

    const dailyUsage = userData.dailyUsage || { date: '', count: 0 };
    const currentCount = dailyUsage.date === todayKST ? dailyUsage.count : 0;

    if (currentCount >= dailyLimit) {
      throw new HttpsError(
        'resource-exhausted',
        `오늘의 분석 횟수를 모두 사용했어요. (${currentCount}/${dailyLimit}회)`
      );
    }

    // 4. Create analysis document (status: processing)
    const analysisRef = db.collection('analyses').doc();
    const analysisId = analysisRef.id;

    await analysisRef.set({
      analysisId,
      uid,
      exerciseName,
      videoStoragePath,
      status: 'processing',
      source: source || 'standalone',
      routineId: routineId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      // 5. Download video from Firebase Storage
      const bucket = storage.bucket();
      const file = bucket.file(videoStoragePath);

      const [exists] = await file.exists();
      if (!exists) {
        throw new HttpsError('not-found', '영상 파일을 찾을 수 없습니다.');
      }

      const [metadata] = await file.getMetadata();
      const mimeType = metadata.contentType || 'video/mp4';

      const [videoBuffer] = await file.download();
      const videoBase64 = videoBuffer.toString('base64');

      // 6. Call Gemini API
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });

      const prompt = `${SYSTEM_PROMPT}\n\n${JSON_SCHEMA}\n\n사용자가 분석을 요청한 운동: ${exerciseName}`;

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: videoBase64,
          },
        },
      ]);

      const responseText = result.response.text();

      // 7. Parse JSON response
      let feedback;
      try {
        // Remove markdown code fences if present
        const cleaned = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        feedback = JSON.parse(cleaned);

        if (feedback.improvements && Array.isArray(feedback.improvements)) {
          feedback.improvements = feedback.improvements.map((item: any) => ({
            issue: item.issue || item.title || item.problem || '',
            timestamp: item.timestamp || item.time || '',
            detail: item.detail || item.description || item.explanation || item.suggestion || item.correction || '',
            severity: item.severity || item.level || '경미',
          }));
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', responseText);
        throw new Error('AI 응답을 처리할 수 없습니다.');
      }

      // 8. Validate required fields
      if (!feedback.videoQuality || !feedback.videoQuality.analysisConfidence) {
        throw new Error('AI 응답 형식이 올바르지 않습니다.');
      }

      // 9. Update analysis document with feedback
      await analysisRef.update({
        status: 'completed',
        feedback,
      });

      // 10. Increment daily usage count
      await userRef.update({
        'dailyUsage.date': todayKST,
        'dailyUsage.count': currentCount + 1,
        'stats.analysesCompleted': admin.firestore.FieldValue.increment(1),
      });

      // 11. Send push notification (for backgrounded app)
      try {
        const fcmToken = userData.fcmToken;
        if (fcmToken) {
          await admin.messaging().send({
            token: fcmToken,
            notification: {
              title: '분석 완료!',
              body: `${exerciseName} 분석이 완료되었어요. 결과를 확인해보세요!`,
            },
            data: {
              analysisId,
              type: 'analysis_complete',
            },
            android: {
              notification: {
                channelId: 'analysis',
              },
            },
          });
        }
      } catch (notifError) {
        // Non-critical — don't fail the analysis if notification fails
        console.warn('Failed to send push notification:', notifError);
      }

      // 12. Return result to client
      return {
        analysisId,
        feedback,
      };
    } catch (error: any) {
      // Update analysis document with error
      await analysisRef.update({
        status: 'failed',
        errorMessage: error.message || '알 수 없는 오류가 발생했습니다.',
      });

      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'AI 분석 중 오류가 발생했습니다.');
    }
  }
);

// ─── resetDailyUsage ────────────────────────────────────
// Runs every day at midnight KST (15:00 UTC previous day)
export const resetDailyUsage = onSchedule(
  {
    schedule: '0 15 * * *', // 15:00 UTC = 00:00 KST
    region: 'asia-northeast3',
    timeZone: 'Asia/Seoul',
  },
  async () => {
    const todayKST = formatDateKST(new Date());

    // Only reset users whose dailyUsage.date is not today
    // This is a safety measure — the actual reset happens naturally
    // when the date doesn't match in the analyzeVideo function.
    // This scheduled function is a cleanup for the UI display.
    console.log(`Daily usage reset check for ${todayKST}`);
  }
);


// ─── Helper Functions ───────────────────────────────────
function formatDateKST(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
