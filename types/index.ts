/**
 * 자세ai TypeScript Type Definitions
 */

// ─── User ───────────────────────────────────────────────
export interface User {
  uid: string;
  username: string;
  displayName?: string;
  email?: string;
  authProvider?: 'google' | 'apple';
  stats: {
    analysesCompleted: number;
    routineCount: number;
  };
  subscription: {
    status: 'active' | 'expired' | 'trial' | 'none';
    revenueCatId?: string;
  };
  dailyUsage: {
    date: string; // YYYY-MM-DD KST
    count: number;
  };
  createdAt: Date;
}

// ─── Routine ────────────────────────────────────────────
export interface RoutineExercise {
  order: number;
  name: string;
}

export interface Routine {
  routineId: string;
  uid: string;
  name: string;
  exercises: RoutineExercise[];
  exerciseCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Analysis ───────────────────────────────────────────
export interface Improvement {
  issue: string;
  timestamp: string; // e.g., '0:03'
  detail: string;
  severity: '주의' | '경미';
}

export interface AnalysisFeedback {
  videoQuality: {
    analysisConfidence: 'high' | 'low';
    qualityIssues: string[];
  };
  overallScore: number | null; // 1-10, null if confidence is low
  summary: string;
  goodPoints: string[];
  improvements: Improvement[];
  injuryRisk: '낮음' | '보통' | '높음';
  overallAdvice: string;
}

export interface Analysis {
  analysisId: string;
  uid: string;
  exerciseName: string;
  videoStoragePath: string;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  source: 'standalone' | 'routine';
  routineId?: string;
  routineSessionDate?: string; // YYYY-MM-DD
  feedback?: AnalysisFeedback;
  createdAt: Date;
}

// ─── Session (local state only) ─────────────────────────
export interface RoutineSession {
  routineId: string;
  routineName: string;
  exercises: RoutineExercise[];
  currentIndex: number;
  completedAnalyses: {
    exerciseName: string;
    analysisId?: string;
    score?: number | null;
    skipped: boolean;
  }[];
}

// ─── Daily Limit ────────────────────────────────────────
export const DAILY_LIMITS = {
  trial: 10,
  none: 1,    // free analysis (first one only, handled differently)
  active: 20,
  expired: 0,
} as const;

export const VIDEO_DURATION_LIMITS = {
  min: 3,   // seconds
  max: 60,  // seconds
} as const;

// ─── Subscription Plans ─────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  monthly: {
    price: '₩9,900',
    priceRaw: 9900,
    period: '월',
  },
  annual: {
    price: '₩47,520',
    priceRaw: 47520,
    period: '년',
    discount: '60%',
  },
} as const;
