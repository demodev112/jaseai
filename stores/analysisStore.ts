/**
 * Analysis Store (Zustand)
 * Manages current analysis state and history.
 */

import { create } from 'zustand';
import type { Analysis } from '@/types';

interface AnalysisState {
  // Current analysis in progress
  currentAnalysis: Analysis | null;

  // Recent analyses for home screen
  recentAnalyses: Analysis[];

  // Actions
  setCurrentAnalysis: (analysis: Analysis | null) => void;
  updateCurrentAnalysis: (updates: Partial<Analysis>) => void;
  setRecentAnalyses: (analyses: Analysis[]) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  currentAnalysis: null,
  recentAnalyses: [],

  setCurrentAnalysis: (currentAnalysis) => set({ currentAnalysis }),

  updateCurrentAnalysis: (updates) =>
    set((state) => ({
      currentAnalysis: state.currentAnalysis
        ? { ...state.currentAnalysis, ...updates }
        : null,
    })),

  setRecentAnalyses: (recentAnalyses) => set({ recentAnalyses }),

  reset: () => set({ currentAnalysis: null, recentAnalyses: [] }),
}));
