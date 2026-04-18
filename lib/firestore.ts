/**
 * Firestore Service Layer
 *
 * All Firestore reads and writes go through this file.
 * Screens never call Firestore directly.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
  type Query,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type { User, Routine, RoutineExercise, Analysis } from '@/types';

// ─── Timeout wrapper ───────────────────────────────────
// Prevents getDocs from hanging forever in React Native
function getDocsWithTimeout<T extends DocumentData>(
  q: Query<T>,
  timeoutMs: number = 10000,
) {
  return Promise.race([
    getDocs(q),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestore query timed out after ${timeoutMs}ms`)), timeoutMs),
    ),
  ]);
}

// ─── Users ──────────────────────────────────────────────

export async function createUserDocument(
  uid: string,
  data: {
    username: string;
    displayName?: string;
    email?: string;
    authProvider?: 'google' | 'apple';
  },
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    username: data.username,
    displayName: data.displayName || data.username,
    email: data.email || '',
    authProvider: data.authProvider || 'google',
    stats: {
      analysesCompleted: 0,
      routineCount: 0,
    },
    subscription: {
      status: 'trial',
    },
    dailyUsage: {
      date: '',
      count: 0,
    },
    createdAt: serverTimestamp(),
  });
}

export async function getUserDocument(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as User;
}

export async function updateUserDocument(
  uid: string,
  data: Partial<Pick<User, 'username' | 'displayName'>>,
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, data);
}

// ─── Routines ───────────────────────────────────────────

export async function createRoutine(
  uid: string,
  name: string,
  exercises: RoutineExercise[],
): Promise<string> {
  const routineRef = await addDoc(collection(db, 'routines'), {
    uid,
    name,
    exercises,
    exerciseCount: exercises.length,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Update the routine document with its own ID
  await updateDoc(routineRef, { routineId: routineRef.id });

  // Increment user's routine count
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const currentCount = userSnap.data().stats?.routineCount || 0;
    await updateDoc(userRef, {
      'stats.routineCount': currentCount + 1,
    });
  }

  return routineRef.id;
}

export async function getRoutines(uid: string): Promise<Routine[]> {
  const q = query(
    collection(db, 'routines'),
    where('uid', '==', uid),
    orderBy('updatedAt', 'desc'),
  );
  const snap = await getDocsWithTimeout(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      routineId: d.id,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    } as Routine;
  });
}

export async function updateRoutine(
  routineId: string,
  data: { name?: string; exercises?: RoutineExercise[] },
): Promise<void> {
  const routineRef = doc(db, 'routines', routineId);
  const updateData: Record<string, any> = { updatedAt: serverTimestamp() };
  if (data.name) updateData.name = data.name;
  if (data.exercises) {
    updateData.exercises = data.exercises;
    updateData.exerciseCount = data.exercises.length;
  }
  await updateDoc(routineRef, updateData);
}

export async function deleteRoutine(uid: string, routineId: string): Promise<void> {
  await deleteDoc(doc(db, 'routines', routineId));

  // Decrement user's routine count
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const currentCount = userSnap.data().stats?.routineCount || 0;
    await updateDoc(userRef, {
      'stats.routineCount': Math.max(0, currentCount - 1),
    });
  }
}

// ─── Analyses ───────────────────────────────────────────

export async function getRecentAnalyses(
  uid: string,
  count: number = 10,
): Promise<Analysis[]> {
  const q = query(
    collection(db, 'analyses'),
    where('uid', '==', uid),
    where('status', '==', 'completed'),
    orderBy('createdAt', 'desc'),
    limit(count),
  );
  const snap = await getDocsWithTimeout(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      analysisId: d.id,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    } as Analysis;
  });
}

export async function getAnalysisById(analysisId: string): Promise<Analysis | null> {
  const snap = await getDoc(doc(db, 'analyses', analysisId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    analysisId: snap.id,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
  } as Analysis;
}

/**
 * Subscribe to real-time updates on an analysis document.
 * Used on the loading screen to detect when processing completes.
 */
export function subscribeToAnalysis(
  analysisId: string,
  callback: (analysis: Analysis) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'analyses', analysisId), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      callback({
        ...data,
        analysisId: snap.id,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      } as Analysis);
    }
  });
}

// ─── Account Deletion ───────────────────────────────────

export async function deleteUserData(uid: string): Promise<void> {
  
  // Delete videos from Storage
  const folderRef = ref(storage, `videos/${uid}`);
  const { items } = await listAll(folderRef);
  for (const item of items) {
    await deleteObject(item);
  }
  
  // Delete all routines
  const routinesSnap = await getDocsWithTimeout(
    query(collection(db, 'routines'), where('uid', '==', uid)),
  );
  for (const routineDoc of routinesSnap.docs) {
    await deleteDoc(routineDoc.ref);
  }

  // Delete all analyses
  const analysesSnap = await getDocsWithTimeout(
    query(collection(db, 'analyses'), where('uid', '==', uid)),
  );
  for (const analysisDoc of analysesSnap.docs) {
    await deleteDoc(analysisDoc.ref);
  }

  // Delete user document
  await deleteDoc(doc(db, 'users', uid));
}

// ─── Aliases for screen imports ─────────────────────────
export const getUserAnalyses = getRecentAnalyses;
export const getUserRoutines = getRoutines;
export const getAnalysis = getAnalysisById;
export const deleteUserAccount = deleteUserData;

// ─── Routine session helper ────────────────────────────
export async function getLatestRoutineAnalysis(
  uid: string,
  routineId: string,
): Promise<Analysis | null> {
  const q = query(
    collection(db, 'analyses'),
    where('uid', '==', uid),
    where('source', '==', 'routine'),
    where('routineId', '==', routineId),
    where('status', '==', 'completed'),
    orderBy('createdAt', 'desc'),
    limit(1),
  );
  const snap = await getDocsWithTimeout(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return {
    ...data,
    analysisId: snap.docs[0].id,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
  } as Analysis;
}
