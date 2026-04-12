/**
 * Routine Store (Zustand)
 * Manages routines and active routine session state.
 */

import { create } from 'zustand';
import type { Routine, RoutineSession } from '@/types';

interface RoutineState {
  // Saved routines
  routines: Routine[];

  // Active session (local state, lost on app close)
  activeSession: RoutineSession | null;

  // Actions
  setRoutines: (routines: Routine[]) => void;
  addRoutine: (routine: Routine) => void;
  removeRoutine: (routineId: string) => void;

  // Session actions
  startSession: (session: RoutineSession) => void;
  advanceSession: () => void;
  markExerciseComplete: (analysisId: string, score: number | null) => void;
  markExerciseSkipped: () => void;
  endSession: () => void;

  reset: () => void;
}

export const useRoutineStore = create<RoutineState>((set) => ({
  routines: [],
  activeSession: null,

  setRoutines: (routines) => set({ routines }),

  addRoutine: (routine) =>
    set((state) => ({ routines: [routine, ...state.routines] })),

  removeRoutine: (routineId) =>
    set((state) => ({
      routines: state.routines.filter((r) => r.routineId !== routineId),
    })),

  startSession: (activeSession) => set({ activeSession }),

  advanceSession: () =>
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          currentIndex: state.activeSession.currentIndex + 1,
        },
      };
    }),

  markExerciseComplete: (analysisId, score) =>
    set((state) => {
      if (!state.activeSession) return state;
      const completed = [...state.activeSession.completedAnalyses];
      completed[state.activeSession.currentIndex] = {
        exerciseName:
          state.activeSession.exercises[state.activeSession.currentIndex].name,
        analysisId,
        score,
        skipped: false,
      };
      return {
        activeSession: { ...state.activeSession, completedAnalyses: completed },
      };
    }),

  markExerciseSkipped: () =>
    set((state) => {
      if (!state.activeSession) return state;
      const completed = [...state.activeSession.completedAnalyses];
      completed[state.activeSession.currentIndex] = {
        exerciseName:
          state.activeSession.exercises[state.activeSession.currentIndex].name,
        skipped: true,
      };
      return {
        activeSession: { ...state.activeSession, completedAnalyses: completed },
      };
    }),

  endSession: () => set({ activeSession: null }),

  reset: () => set({ routines: [], activeSession: null }),
}));
