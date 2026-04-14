import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import { auth } from '@/lib/firebase';
import { getLatestRoutineAnalysis } from '@/lib/firestore';

type ExerciseStatus = 'pending' | 'recording' | 'analyzed' | 'skipped';

interface SessionExercise {
  name: string;
  status: ExerciseStatus;
  score?: number | null;
  analysisId?: string;
}

export default function RoutineSessionScreen() {
  const params = useLocalSearchParams<{
    routineId: string;
    routineName: string;
    exercises: string;
  }>();

  // ── Bug 1 fix: safely parse exercises that may be objects ({order, name}) or plain strings ──
  const exerciseNames: string[] = (() => {
    try {
      const parsed = JSON.parse(params.exercises || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item: any) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && typeof item.name === 'string') return item.name;
        return String(item);
      });
    } catch {
      return [];
    }
  })();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [exercises, setExercises] = useState<SessionExercise[]>(
    exerciseNames.map((name) => ({ name, status: 'pending' }))
  );
  const [showSummary, setShowSummary] = useState(false);

  const currentExercise = exercises[currentIndex];
  const progress = exercises.filter((e) => e.status !== 'pending' && e.status !== 'recording').length;
  const totalExercises = exercises.length;

  const { user, hasActiveSubscription } = useAuthStore();
  const uid = user?.uid || auth.currentUser?.uid;

  // ── Bug 3 fix: on focus, query Firestore for latest completed analysis for this routine ──
  useFocusEffect(
    useCallback(() => {
      const checkForResult = async () => {
        if (!uid || !params.routineId) return;

        // Only check if there's an exercise currently in 'recording' state
        const recordingIdx = exercises.findIndex((e) => e.status === 'recording');
        if (recordingIdx === -1) return;

        try {
          const analysis = await getLatestRoutineAnalysis(uid, params.routineId);
          if (!analysis || !analysis.feedback) return;

          // Match by exercise name to be safe
          const exerciseName = exercises[recordingIdx].name;
          if (analysis.exerciseName !== exerciseName) return;

          setExercises((prev) => {
            const updated = [...prev];
            updated[recordingIdx] = {
              ...updated[recordingIdx],
              status: 'analyzed',
              score: analysis.feedback?.overallScore ?? null,
              analysisId: analysis.analysisId,
            };
            return updated;
          });
        } catch (error) {
          console.error('[Session] Failed to fetch analysis result:', error);
        }
      };

      checkForResult();
    }, [uid, params.routineId, exercises])
  );

  const handleAnalyze = async () => {
    if (!hasActiveSubscription()) {
      console.log('[DEBUG] Subscription check failed, allowing for testing');
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      videoMaxDuration: 30,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const duration = (asset.duration || 0) / 1000;
      if (duration < 3) {
        Alert.alert('영상이 너무 짧아요', '최소 3초 이상의 영상을 선택해주세요.');
        return;
      }
      if (duration > 60) {
        Alert.alert('영상이 너무 길어요', '60초 이하의 영상을 선택해주세요.');
        return;
      }

      // ── Bug 2 fix: mark as 'recording', not 'analyzed' with hardcoded score ──
      setExercises((prev) => {
        const updated = [...prev];
        updated[currentIndex] = { ...updated[currentIndex], status: 'recording' };
        return updated;
      });

      router.push({
        pathname: '/analysis/loading',
        params: {
          exerciseName: currentExercise.name,
          videoUri: asset.uri,
          source: 'routine',
          routineId: params.routineId,
          sessionIndex: String(currentIndex),
        },
      });
    }
  };

  const handleRecord = async () => {
    if (!hasActiveSubscription()) {
      console.log('[DEBUG] Subscription check failed, allowing for testing');
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      videoMaxDuration: 30,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const duration = (asset.duration || 0) / 1000;
      if (duration < 3) {
        Alert.alert('영상이 너무 짧아요', '최소 3초 이상 촬영해주세요.');
        return;
      }

      // ── Bug 2 fix: mark as 'recording', not 'analyzed' with hardcoded score ──
      setExercises((prev) => {
        const updated = [...prev];
        updated[currentIndex] = { ...updated[currentIndex], status: 'recording' };
        return updated;
      });

      router.push({
        pathname: '/analysis/loading',
        params: {
          exerciseName: currentExercise.name,
          videoUri: asset.uri,
          source: 'routine',
          routineId: params.routineId,
          sessionIndex: String(currentIndex),
        },
      });
    }
  };

  const handleSkip = () => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], status: 'skipped' };
      return updated;
    });
    goToNext();
  };

  const goToNext = () => {
    if (currentIndex < totalExercises - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleNextExercise = () => {
    goToNext();
  };

  const handleEndSession = () => {
    Alert.alert(
      '세션 종료',
      '루틴 세션을 종료하시겠어요?',
      [
        { text: '계속하기', style: 'cancel' },
        { text: '종료', style: 'destructive', onPress: () => router.replace('/(tabs)/routines') },
      ]
    );
  };

  // Summary screen
  if (showSummary) {
    const analyzed = exercises.filter((e) => e.status === 'analyzed');
    const skipped = exercises.filter((e) => e.status === 'skipped');
    const scoredExercises = analyzed.filter((e) => e.score != null && e.score > 0);
    const avgScore = scoredExercises.length > 0
      ? Math.round(scoredExercises.reduce((sum, e) => sum + (e.score || 0), 0) / scoredExercises.length * 10) / 10
      : 0;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.summaryContent}>
          <Text style={styles.summaryTitle}>🎉 루틴 완료!</Text>
          <Text style={styles.routineName}>{params.routineName}</Text>

          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{analyzed.length}</Text>
              <Text style={styles.statLabel}>분석 완료</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{skipped.length}</Text>
              <Text style={styles.statLabel}>건너뜀</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.primary }]}>{avgScore || '-'}</Text>
              <Text style={styles.statLabel}>평균 점수</Text>
            </View>
          </View>

          {exercises.map((exercise, idx) => (
            <View key={idx} style={styles.summaryItem}>
              <Text style={styles.summaryIndex}>{idx + 1}</Text>
              <Text style={styles.summaryExName}>{exercise.name}</Text>
              {exercise.status === 'analyzed' && exercise.score != null ? (
                <View style={styles.summaryScoreBadge}>
                  <Text style={styles.summaryScore}>{exercise.score}</Text>
                </View>
              ) : exercise.status === 'analyzed' ? (
                <Text style={styles.summarySkipped}>분석됨</Text>
              ) : (
                <Text style={styles.summarySkipped}>건너뜀</Text>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.doneButton} onPress={() => router.replace('/(tabs)/routines')} activeOpacity={0.8}>
            <Text style={styles.doneButtonText}>홈으로 돌아가기</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Session exercise screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sessionHeader}>
        <TouchableOpacity onPress={handleEndSession}>
          <Text style={styles.endSessionText}>✕ 종료</Text>
        </TouchableOpacity>
        <Text style={styles.progressText}>{currentIndex + 1} / {totalExercises}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(progress / totalExercises) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.exerciseContent}>
        <Text style={styles.currentLabel}>현재 운동</Text>
        <Text style={styles.currentExerciseName}>{currentExercise?.name}</Text>

        {currentExercise?.status === 'analyzed' ? (
          <View style={styles.analyzedContainer}>
            {currentExercise.score != null ? (
              <View style={styles.analyzedBadge}>
                <Text style={styles.analyzedScore}>{currentExercise.score}</Text>
                <Text style={styles.analyzedLabel}>/10</Text>
              </View>
            ) : null}
            <Text style={styles.analyzedText}>분석 완료!</Text>
            <TouchableOpacity style={styles.nextButton} onPress={handleNextExercise} activeOpacity={0.8}>
              <Text style={styles.nextButtonText}>
                {currentIndex < totalExercises - 1 ? '다음 운동 →' : '결과 보기'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : currentExercise?.status === 'recording' ? (
          <View style={styles.analyzedContainer}>
            <Text style={styles.analyzedText}>분석 중... 결과를 기다리고 있어요</Text>
          </View>
        ) : (
          <>
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>📹 촬영 팁</Text>
              <Text style={styles.tipText}>• 전신이 보이도록 촬영해주세요</Text>
              <Text style={styles.tipText}>• 슬로모션으로 촬영하면 더 정확해요</Text>
            </View>

            <TouchableOpacity style={styles.analyzeButton} onPress={handleRecord} activeOpacity={0.8}>
              <Text style={styles.analyzeButtonText}>📷 촬영하기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryButton} onPress={handleAnalyze} activeOpacity={0.8}>
              <Text style={styles.galleryButtonText}>🖼️ 갤러리에서 선택</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>이 운동 건너뛰기</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Exercise list at bottom */}
      <View style={styles.exerciseList}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exerciseListContent}>
          {exercises.map((ex, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.exercisePill,
                idx === currentIndex && styles.exercisePillActive,
                ex.status === 'analyzed' && styles.exercisePillDone,
                ex.status === 'skipped' && styles.exercisePillSkipped,
              ]}
              onPress={() => setCurrentIndex(idx)}
            >
              <Text style={[
                styles.exercisePillText,
                idx === currentIndex && styles.exercisePillTextActive,
              ]}>
                {ex.status === 'analyzed' ? '✓ ' : ''}{ex.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  endSessionText: { fontSize: 14, color: Colors.textMuted },
  progressText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  progressBar: { height: 4, backgroundColor: Colors.backgroundTertiary, marginHorizontal: 20, borderRadius: 2, marginBottom: 20 },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  exerciseContent: { paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
  currentLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  currentExerciseName: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 24, textAlign: 'center' },
  tipCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 16, marginBottom: 24, width: '100%', borderWidth: 1, borderColor: Colors.border },
  tipTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  tipText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 22 },
  analyzeButton: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, width: '100%', alignItems: 'center', marginBottom: 12 },
  analyzeButtonText: { fontSize: 18, fontWeight: '700', color: Colors.textOnPrimary },
  galleryButton: { backgroundColor: Colors.card, borderRadius: 16, paddingVertical: 16, width: '100%', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  galleryButtonText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  skipButton: { paddingVertical: 12 },
  skipButtonText: { fontSize: 14, color: Colors.textMuted },
  analyzedContainer: { alignItems: 'center', paddingVertical: 20 },
  analyzedBadge: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  analyzedScore: { fontSize: 48, fontWeight: '800', color: Colors.primary },
  analyzedLabel: { fontSize: 20, color: Colors.textTertiary },
  analyzedText: { fontSize: 16, color: Colors.textSecondary, marginBottom: 24 },
  nextButton: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 40, alignItems: 'center' },
  nextButtonText: { fontSize: 16, fontWeight: '700', color: Colors.textOnPrimary },
  exerciseList: { borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: 12 },
  exerciseListContent: { paddingHorizontal: 20, gap: 8 },
  exercisePill: { backgroundColor: Colors.backgroundSecondary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  exercisePillActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  exercisePillDone: { backgroundColor: Colors.scoreHigh + '15', borderColor: Colors.scoreHigh + '40' },
  exercisePillSkipped: { opacity: 0.5 },
  exercisePillText: { fontSize: 13, color: Colors.textSecondary },
  exercisePillTextActive: { color: Colors.primary, fontWeight: '600' },
  summaryContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40, alignItems: 'center' },
  summaryTitle: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  routineName: { fontSize: 16, color: Colors.textSecondary, marginBottom: 32 },
  summaryStats: { flexDirection: 'row', gap: 24, marginBottom: 32 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 8, width: '100%', borderWidth: 1, borderColor: Colors.border },
  summaryIndex: { fontSize: 14, fontWeight: '700', color: Colors.textMuted, width: 24 },
  summaryExName: { flex: 1, fontSize: 15, color: Colors.text },
  summaryScoreBadge: { backgroundColor: Colors.primary + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  summaryScore: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  summarySkipped: { fontSize: 13, color: Colors.textMuted },
  doneButton: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, width: '100%', alignItems: 'center', marginTop: 24 },
  doneButtonText: { fontSize: 16, fontWeight: '700', color: Colors.textOnPrimary },
});
