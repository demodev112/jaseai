import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { checkOnboardingStatus } from '@/lib/auth';
import type { User } from '@/types';

export default function RootLayout() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const status = await checkOnboardingStatus(firebaseUser.uid);

        const user: User = {
          uid: firebaseUser.uid,
          username: firebaseUser.displayName || '',
          stats: { analysesCompleted: 0, routineCount: 0 },
          subscription: { status: 'trial' },
          dailyUsage: {
            date: new Date().toISOString().split('T')[0],
            count: 0,
          },
          createdAt: new Date(),
        };
        setUser(user);

        if (!status.hasUsername) {
          router.replace('/(auth)/name-setup');
        } else if (!status.hasRoutine) {
          router.replace('/(auth)/first-routine');
        } else {
          router.replace('/(tabs)/home');
        }
      } else {
        setUser(null);
        setLoading(false);
        const onboardingDone = await AsyncStorage.getItem('onboarding_done');
        router.replace(
          onboardingDone ? '/(auth)/login' : '/(auth)/onboarding'
        );
      }
    });

    return unsubscribe;
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="paywall" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
