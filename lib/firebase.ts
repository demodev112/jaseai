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
import {
  initializeAuth,
  getAuth,
  // @ts-ignore — getReactNativePersistence exists at runtime in RN environment
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDF7WgA-hK7mKRBubk6J73XW1q0Oyn3d34',
  authDomain: 'formai-493012.firebaseapp.com',
  projectId: 'formai-493012',
  storageBucket: 'formai-493012.firebasestorage.app',
  messagingSenderId: '10201445254',
  appId: '1:10201445254:web:0b61017f4186d82c59b207',
  measurementId: 'G-ZDEFLJTDYB',
};

// Initialize Firebase (prevent re-initialization in dev mode)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Use React Native persistence for auth (keeps user logged in across app restarts)
let auth: Auth;
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
export const functions = getFunctions(app, 'asia-northeast3');
export default app;
