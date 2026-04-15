import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import { auth } from '@/lib/firebase';
import { submitAnalysis, type UploadProgress } from '@/lib/analysis';
import { getUserFriendlyError, isNetworkError } from '@/lib/errors';

export default function AnalysisLoadingScreen() {
  const params = useLocalSearchParams<{
    exerciseName: string;
    videoUri: string;
    source: string;
    routineId?: string;
    sessionIndex?: string;
  }>();

  const { user } = useAuthStore();
  const uid = user?.uid || auth.currentUser?.uid;
  const [statusMessage, setStatusMessage] = useState('준비 중...');
  const spinAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const hasStarted = useRef(false);

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const runAnalysis = async () => {
      // Wait for auth state to propagate if uid is not yet available
      let resolvedUid = uid;
      if (!resolvedUid) {
        await new Promise((r) => setTimeout(r, 500));
        resolvedUid = useAuthStore.getState().user?.uid || auth.currentUser?.uid;
      }
      if (!resolvedUid) {
        await new Promise((r) => setTimeout(r, 1000));
        resolvedUid = useAuthStore.getState().user?.uid || auth.currentUser?.uid;
      }

      if (!resolvedUid || !params.videoUri || !params.exerciseName) {
        Alert.alert('오류', '필요한 정보가 없습니다.');
        router.back();
        return;
      }

      try {
        const result = await submitAnalysis(
          resolvedUid,
          {
            exerciseName: params.exerciseName,
            videoUri: params.videoUri,
            source: (params.source as 'standalone' | 'routine') || 'standalone',
            routineId: params.routineId || undefined,
          },
          (progress: UploadProgress) => {
            setStatusMessage(progress.message);
            Animated.timing(progressAnim, {
              toValue: progress.progress / 100,
              duration: 300,
              useNativeDriver: false,
            }).start();
          },
        );

        // Success — navigate to feedback
        Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start(() => {
          router.replace({
            pathname: '/analysis/feedback',
            params: {
              exerciseName: params.exerciseName,
              source: params.source,
              routineId: params.routineId || '',
              sessionIndex: params.sessionIndex || '',
              analysisId: result.analysisId,
            },
          });
        });
      } catch (error: any) {
        const { title, message, isRetryable } = getUserFriendlyError(error);

        const buttons = isRetryable
          ? [
              { text: '돌아가기', style: 'cancel' as const, onPress: () => router.back() },
              { text: '다시 시도', onPress: () => { hasStarted.current = false; runAnalysis(); } },
            ]
          : [{ text: '확인', onPress: () => router.back() }];

        Alert.alert(title, `${message}\n\nDebug: ${error?.message || JSON.stringify(error)}`, buttons);
      }
    };

    runAnalysis();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.exerciseName}>{params.exerciseName}</Text>
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
          <View style={styles.spinnerInner} />
        </Animated.View>
        <Text style={styles.loadingMessage}>{statusMessage}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>
        <View style={styles.tipContainer}>
          <Text style={styles.tipText}>💡 분석은 보통 10-20초 정도 걸려요</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  exerciseName: { fontSize: 20, fontWeight: '700', color: Colors.primary, marginBottom: 40 },
  spinner: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: Colors.backgroundTertiary, borderTopColor: Colors.primary, marginBottom: 32 },
  spinnerInner: { flex: 1 },
  loadingMessage: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32, minHeight: 24 },
  progressContainer: { width: '100%', marginBottom: 40 },
  progressTrack: { height: 6, backgroundColor: Colors.backgroundTertiary, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  tipContainer: { position: 'absolute', bottom: 60 },
  tipText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});
