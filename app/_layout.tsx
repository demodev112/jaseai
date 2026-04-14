import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { checkOnboardingStatus } from '@/lib/auth';
import Colors from '@/constants/Colors';
import type { User } from '@/types';

export {
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setUser, setLoading } = useAuthStore();

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

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

  if (!loaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="analysis/loading"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="analysis/feedback"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="analysis/detail"
          options={{ presentation: 'card' }}
        />
        <Stack.Screen name="paywall" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
