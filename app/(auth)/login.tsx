import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import Colors from '@/constants/Colors';
import { signInWithApple, signInWithGoogle } from '@/lib/auth';
import { getUserFriendlyError } from '@/lib/errors';

type AuthProvider = 'google' | 'apple' | 'kakao';

// ─── Nonce helpers for Apple Sign-In ────────────────────
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

async function sha256(input: string): Promise<string> {
  // Use Web Crypto API (available in Hermes / React Native)
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState<AuthProvider | null>(null);

  // ─── Apple Sign-In ──────────────────────────────────
  const handleAppleLogin = async () => {
    setIsLoading('apple');
    try {
      // 1. Generate a random nonce and hash it
      const rawNonce = generateRandomString(32);
      const hashedNonce = await sha256(rawNonce);

      // 2. Request Apple Sign-In with the hashed nonce
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      // 3. Ensure we got an identity token
      if (!credential.identityToken) {
        throw new Error('Apple Sign-In failed: no identity token returned');
      }

      // 4. Sign in to Firebase with the Apple credential
      await signInWithApple(credential.identityToken, rawNonce);

      // 5. Navigate to root — index.tsx will handle routing
      //    (checks username → name-setup or tabs)
      router.replace('/');
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled — don't show error
        return;
      }
      console.error('Apple Sign-In error:', error);
      const { title, message } = getUserFriendlyError(error);
      Alert.alert(title, message, [{ text: '확인' }]);
    } finally {
      setIsLoading(null);
    }
  };

  // ─── Google Sign-In ─────────────────────────────────
  const handleGoogleLogin = async () => {
    setIsLoading('google');
    try {
      // Import dynamically to avoid crashes if not configured
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');

      // Check if Google Play Services are available (Android only)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo?.data?.idToken || userInfo?.idToken;

      if (!idToken) {
        throw new Error('Google Sign-In failed: no ID token returned');
      }

      // Sign in to Firebase with the Google credential
      await signInWithGoogle(idToken);

      // Navigate to root — index.tsx will handle routing
      router.replace('/');
    } catch (error: any) {
      if (
        error?.code === 'SIGN_IN_CANCELLED' ||
        error?.code === '12501' ||
        error?.message?.includes('cancel')
      ) {
        // User cancelled — don't show error
        return;
      }
      console.error('Google Sign-In error:', error);
      const { title, message } = getUserFriendlyError(error);
      Alert.alert(title, message, [{ text: '확인' }]);
    } finally {
      setIsLoading(null);
    }
  };

  // ─── Kakao Sign-In ──────────────────────────────────
  const handleKakaoLogin = async () => {
    Alert.alert(
      '준비 중',
      '카카오 로그인은 곧 지원될 예정입니다.\n다른 로그인 방법을 이용해주세요.',
      [{ text: '확인' }],
    );
  };

  // ─── Route to correct handler ───────────────────────
  const handleLogin = async (provider: AuthProvider) => {
    switch (provider) {
      case 'apple':
        return handleAppleLogin();
      case 'google':
        return handleGoogleLogin();
      case 'kakao':
        return handleKakaoLogin();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo area */}
        <View style={styles.logoArea}>
          <Text style={styles.logoEmoji}>🏋️</Text>
          <Text style={styles.logoText}>자세 AI</Text>
          <Text style={styles.logoSubtext}>
            로그인하고 AI 트레이너를 만나보세요
          </Text>
        </View>

        {/* Login buttons */}
        <View style={styles.buttonArea}>
          {/* Apple */}
          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={() => handleLogin('apple')}
            disabled={isLoading !== null}
          >
            {isLoading === 'apple' ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Text style={styles.appleIcon}></Text>
                <Text style={[styles.socialButtonText, styles.appleText]}>
                  Apple로 계속하기
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Google */}
          <TouchableOpacity
            style={[styles.socialButton, styles.googleButton]}
            onPress={() => handleLogin('google')}
            disabled={isLoading !== null}
          >
            {isLoading === 'google' ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={[styles.socialButtonText, styles.googleText]}>
                  Google로 계속하기
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Kakao */}
          <TouchableOpacity
            style={[styles.socialButton, styles.kakaoButton]}
            onPress={() => handleLogin('kakao')}
            disabled={isLoading !== null}
          >
            {isLoading === 'kakao' ? (
              <ActivityIndicator color="#3C1E1E" />
            ) : (
              <>
                <Text style={styles.kakaoIcon}>💬</Text>
                <Text style={[styles.socialButtonText, styles.kakaoText]}>
                  카카오로 계속하기
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <View style={styles.termsArea}>
          <Text style={styles.termsText}>
            계속 진행하면{' '}
            <Text
              style={styles.termsLink}
              onPress={() => router.push('/terms')}
            >
              이용약관
            </Text>
            {' '}및{' '}
            <Text
              style={styles.termsLink}
              onPress={() => router.push('/privacy')}
            >
              개인정보처리방침
            </Text>
            에{'\n'}동의하는 것으로 간주됩니다.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  logoSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  buttonArea: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Apple
  appleButton: {
    backgroundColor: '#FFFFFF',
  },
  appleIcon: {
    fontSize: 18,
    color: '#000',
  },
  appleText: {
    color: '#000',
  },
  // Google
  googleButton: {
    backgroundColor: '#F2F2F2',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleText: {
    color: '#333',
  },
  // Kakao
  kakaoButton: {
    backgroundColor: '#FEE500',
  },
  kakaoIcon: {
    fontSize: 16,
  },
  kakaoText: {
    color: '#3C1E1E',
  },
  termsArea: {
    marginTop: 32,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
    color: Colors.textSecondary,
  },
});
