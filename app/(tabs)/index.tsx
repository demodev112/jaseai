import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function TabIndex() {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/(auth)/onboarding');
    } else {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isLoading]);

  return null;
}
