import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';

export {
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
        {/* Auth flow (onboarding, login, name setup) */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* Main app (tabs) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Analysis screens (modal presentation) */}
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

        {/* Paywall (modal) */}
        <Stack.Screen
          name="paywall"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />

        {/* 404 */}
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
