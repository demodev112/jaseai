/**
 * Authentication Service
 *
 * Handles Google and Apple login flows using Firebase Auth.
 */

import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User } from '@/types';

// ─── Google Login ──────────────────────────────────────────

/**
 * Sign in with Google.
 * @param idToken - Google ID token from @react-native-google-signin
 */
export async function signInWithGoogle(idToken: string): Promise<void> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  await ensureUserDocument(result.user.uid, result.user.displayName);
}

// ─── Apple Login ───────────────────────────────────────────

/**
 * Sign in with Apple.
 * @param identityToken - Apple identity token
 * @param nonce - The raw nonce used in the Apple auth request
 */
export async function signInWithApple(
  identityToken: string,
  nonce: string
): Promise<void> {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: identityToken,
    rawNonce: nonce,
  });
  const result = await signInWithCredential(auth, credential);
  await ensureUserDocument(result.user.uid, result.user.displayName);
}

// ─── Sign Out ──────────────────────────────────────────────

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

// ─── User Document ─────────────────────────────────────────

/**
 * Ensures a Firestore user document exists.
 * If the user is new, creates the document with default values.
 * If the user exists, does nothing (preserves existing data).
 */
async function ensureUserDocument(
  uid: string,
  displayName: string | null
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const newUser: Omit<User, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
      uid,
      username: displayName || '',
      stats: {
        analysesCompleted: 0,
        routineCount: 0,
      },
      subscription: {
        status: 'trial',
      },
      dailyUsage: {
        date: new Date().toISOString().split('T')[0],
        count: 0,
      },
      createdAt: serverTimestamp(),
    };

    await setDoc(userRef, newUser);
  }
}

// ─── Helpers ───────────────────────────────────────────────

/**
 * Check if the current user has completed onboarding
 * (has a username set)
 */
export async function checkOnboardingStatus(uid: string): Promise<{
  hasUsername: boolean;
  hasRoutine: boolean;
  hasCompletedFirstAnalysis: boolean;
}> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return { hasUsername: false, hasRoutine: false, hasCompletedFirstAnalysis: false };
  }

  const data = userSnap.data();
  return {
    hasUsername: !!data.username && data.username.length > 0,
    hasRoutine: (data.stats?.routineCount || 0) > 0,
    hasCompletedFirstAnalysis: (data.stats?.analysesCompleted || 0) > 0,
  };
}

/**
 * Update the user's display name in Firestore
 */
export async function updateUsername(uid: string, username: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { username }, { merge: true });
}
