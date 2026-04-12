/**
 * Push Notification Service (FCM)
 *
 * Handles push notification registration and permission.
 * Used as a fallback when the app is backgrounded during analysis processing.
 *
 * Flow:
 * 1. App requests notification permission on first analysis
 * 2. FCM token is saved to the user's Firestore document
 * 3. When Cloud Function finishes analysis, it sends a push notification
 * 4. User taps notification → app opens to the feedback screen
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Configure notification behavior ──────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowInForeground: true,
  }),
});

// ─── Register for push notifications ──────────────────

export async function registerForPushNotifications(
  userId: string,
): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.warn('[Notifications] Push notifications require a physical device.');
    return null;
  }

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted.');
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('analysis', {
      name: '분석 완료',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00E5A0',
    });
  }

  // Get the Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'YOUR_EXPO_PROJECT_ID', // Replace with your Expo project ID
    });
    const token = tokenData.data;

    // Save token to Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: token,
    });

    return token;
  } catch (error) {
    console.error('[Notifications] Failed to get push token:', error);
    return null;
  }
}

// ─── Listen for notification taps ─────────────────────

export function addNotificationResponseListener(
  callback: (analysisId: string) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.analysisId) {
      callback(data.analysisId as string);
    }
  });
}

// ─── Listen for foreground notifications ──────────────

export function addForegroundNotificationListener(
  callback: (analysisId: string) => void,
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data;
    if (data?.analysisId) {
      callback(data.analysisId as string);
    }
  });
}
