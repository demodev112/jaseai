/**
 * Auth Store (Zustand)
 * Manages user authentication state and onboarding progress.
 */

import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  // Auth state
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Onboarding progress
  hasCompletedOnboarding: boolean;
  hasCompletedFirstAnalysis: boolean;
  hasSeenPaywall: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingComplete: () => void;
  setFirstAnalysisComplete: () => void;
  setPaywallSeen: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  isLoading: true,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  hasCompletedFirstAnalysis: false,
  hasSeenPaywall: false,

  // Actions
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),

  setFirstAnalysisComplete: () => set({ hasCompletedFirstAnalysis: true }),

  setPaywallSeen: () => set({ hasSeenPaywall: true }),

  reset: () =>
    set({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      hasCompletedFirstAnalysis: false,
      hasSeenPaywall: false,
    }),
}));
