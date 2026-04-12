import { Redirect } from 'expo-router';

/**
 * Entry point: decides whether to show onboarding or main app.
 * For now, always redirect to tabs (auth will be added in Phase 5).
 */
export default function Index() {
  // TODO: Check auth state and onboarding completion
  // const { user, hasCompletedOnboarding } = useAuthStore();
  // if (!user) return <Redirect href="/(auth)/onboarding" />;
  // if (!hasCompletedOnboarding) return <Redirect href="/(auth)/first-routine" />;

  return <Redirect href="/(tabs)/home" />;
}
