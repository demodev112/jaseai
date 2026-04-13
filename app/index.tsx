import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import Colors from '@/constants/Colors';
import type { User } from '@/types';

/**
 * Root Entry Point
 *
 * Navigation decision tree:
 * 1. Not authenticated → Onboarding
 * 2. Authenticated, no username → Name Setup
 * 3. Authenticated, has username → Main App (first-routine is optional)
 *
 * Paywall is NOT shown here. It is triggered when the user
 * attempts their first analysis (in the analyze/session screens)
 * if they don't have an active subscription.
 */
export default function Index() {
  const {
    user,
    isLoading,
    isAuthenticated,
    hasCompletedOnboarding,
    setUser,
    setLoading,
    setOnboardingComplete,
  } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in — fetch their Firestore document
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = { ...userSnap.data(), uid: firebaseUser.uid } as User;
            setUser(userData);

            // If user has a username, onboarding is complete
            // (first-routine creation is optional, not required)
            if (userData.username && userData.username.length > 0) {
              setOnboardingComplete();
            }
          } else {
            // User doc doesn't exist yet (just signed up)
            setUser({
              uid: firebaseUser.uid,
              username: '',
              stats: { analysesCompleted: 0, routineCount: 0 },
              subscription: { status: 'trial' },
              dailyUsage: { date: '', count: 0 },
              createdAt: new Date(),
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        // User is not signed in
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Decision tree
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  if (!user?.username || user.username.length === 0) {
    return <Redirect href="/(auth)/name-setup" />;
  }

  // Username exists → go to main app
  // Paywall is handled at the point of analysis, not here
  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
