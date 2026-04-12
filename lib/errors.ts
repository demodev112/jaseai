/**
 * Error Handling Utilities
 *
 * Provides consistent error messages and network error detection
 * across the entire app.
 */

// ─── Network Error Detection ──────────────────────────

export function isNetworkError(error: any): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';

  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('internet') ||
    message.includes('connection') ||
    code === 'unavailable' ||
    code === 'network-request-failed' ||
    code.includes('network')
  );
}

// ─── Firebase Error Translation ───────────────────────

export function getFirebaseErrorMessage(error: any): string {
  const code = error?.code || '';

  const messages: Record<string, string> = {
    // Auth errors
    'auth/user-not-found': '사용자를 찾을 수 없습니다.',
    'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
    'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
    'auth/user-disabled': '비활성화된 계정입니다.',
    'auth/too-many-requests': '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
    'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
    'auth/requires-recent-login': '보안을 위해 다시 로그인해주세요.',
    'auth/popup-closed-by-user': '로그인이 취소되었습니다.',

    // Firestore errors
    'permission-denied': '접근 권한이 없습니다.',
    'not-found': '데이터를 찾을 수 없습니다.',
    'unavailable': '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.',
    'deadline-exceeded': '요청 시간이 초과되었습니다. 다시 시도해주세요.',
    'resource-exhausted': '일일 사용 한도에 도달했습니다.',

    // Storage errors
    'storage/unauthorized': '파일 접근 권한이 없습니다.',
    'storage/canceled': '업로드가 취소되었습니다.',
    'storage/retry-limit-exceeded': '업로드에 실패했습니다. 네트워크를 확인하고 다시 시도해주세요.',
    'storage/invalid-checksum': '파일이 손상되었습니다. 다시 시도해주세요.',
    'storage/server-file-wrong-size': '업로드에 실패했습니다. 다시 시도해주세요.',

    // Cloud Functions errors
    'functions/unauthenticated': '로그인이 필요합니다.',
    'functions/permission-denied': '구독이 필요합니다.',
    'functions/resource-exhausted': '일일 분석 횟수를 모두 사용했습니다.',
    'functions/internal': 'AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.',
  };

  return messages[code] || error?.message || '알 수 없는 오류가 발생했습니다.';
}

// ─── User-Friendly Error Messages ─────────────────────

export function getUserFriendlyError(error: any): {
  title: string;
  message: string;
  isRetryable: boolean;
} {
  if (isNetworkError(error)) {
    return {
      title: '네트워크 오류',
      message: '인터넷 연결을 확인하고 다시 시도해주세요.',
      isRetryable: true,
    };
  }

  const code = error?.code || '';

  // Subscription required
  if (code === 'functions/permission-denied' || code === 'permission-denied') {
    return {
      title: '구독 필요',
      message: '이 기능을 사용하려면 구독이 필요합니다.',
      isRetryable: false,
    };
  }

  // Daily limit
  if (code === 'functions/resource-exhausted' || code === 'resource-exhausted') {
    return {
      title: '일일 한도 초과',
      message: error?.message || '오늘의 분석 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.',
      isRetryable: false,
    };
  }

  // Auth required
  if (code.includes('unauthenticated') || code.includes('auth/')) {
    return {
      title: '인증 오류',
      message: getFirebaseErrorMessage(error),
      isRetryable: false,
    };
  }

  // Default
  return {
    title: '오류',
    message: getFirebaseErrorMessage(error),
    isRetryable: true,
  };
}
