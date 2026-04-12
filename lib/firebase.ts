/**
 * Firebase Configuration
 *
 * IMPORTANT: Replace the placeholder values below with your actual
 * Firebase config from Firebase Console → Project Settings → Your Apps → Web App.
 *
 * These values are NOT secret — they are safe to include in client code.
 * The security comes from Firestore/Storage Security Rules, not from hiding these keys.
 */

import { initializeApp, getApps } from 'firebase/app';
// @ts-ignore — getReactNativePersistence exists at runtime in RN environment
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
  measurementId: 'YOUR_MEASUREMENT_ID',
};

// Initialize Firebase (prevent re-initialization in dev mode)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Use React Native persistence for auth (keeps user logged in across app restarts)
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
