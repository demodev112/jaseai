import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { getUserFriendlyError } from '@/lib/errors';

type AuthProvider = 'google' | 'apple' | 'kakao';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState<AuthProvider | null>(null);

  const handleLogin = async (provider: AuthProvider) => {
    setIsLoading(provider);

    try {
      // TODO: Implement actual auth logic in Phase 2 service layer
      // For now, simulate a login delay and navigate forward
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate to name setup (for new users) or main app (for returning users)
      router.replace('/(auth)/name-setup');
    } catch (error: any) {
      // User cancelled login — don't show error
      if (error?.code === 'ERR_CANCELED' || error?.message?.includes('cancel')) {
        return;
      }
      const { title, message } = getUserFriendlyError(error);
      Alert.alert(title, message, [{ text: '확인' }]);
    } finally {
      setIsLoading(null);
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
