/**
 * Auth Store (Zustand)
 * Manages user authentication state and onboarding progress.
 */

import { create } from 'zustand';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User } from '@/types';

interface AuthState {
  // Auth state
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Onboarding progress
  hasCompletedOnboarding: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingComplete: () => void;
  setSubscriptionActive: (active: boolean) => void;
  signOut: () => Promise<void>;
  reset: () => void;

  // Helpers
  hasActiveSubscription: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isLoading: true,
  isAuthenticated: false,
  hasCompletedOnboarding: false,

  // Actions
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),

  setSubscriptionActive: (active) =>
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            subscription: {
              ...state.user.subscription,
              status: active ? 'active' : 'expired',
            },
          }
        : null,
    })),

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
    set({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
    });
  },

  reset: () =>
    set({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
    }),

  // Check if user has an active subscription (trial or paid)
  hasActiveSubscription: () => {
    const { user } = get();
    if (!user) return false;
    const status = user.subscription?.status;
    return status === 'active' || status === 'trial';
  },
}));
