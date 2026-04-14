import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/Colors';
import { EXERCISE_DATABASE, ALL_EXERCISES } from '@/constants/Exercises';
import { useAuthStore } from '@/stores/authStore';
import { getRecentAnalyses } from '@/lib/firestore';
import { auth } from '@/lib/firebase';
import type { Analysis } from '@/types';

type Step = 'exercise' | 'video';

function getScoreColor(score: number): string {
  if (score >= 8) return Colors.scoreHigh;
  if (score >= 5) return Colors.scoreMedium;
  return Colors.scoreLow;
}

export default function AnalyzeScreen() {
  const [step, setStep] = useState<Step>('exercise');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const { user, hasActiveSubscription } = useAuthStore();
  const uid = user?.uid || auth.currentUser?.uid;

  // Fetch recent analyses when screen gains focus
  useFocusEffect(
    useCallback(() => {
      const loadRecent = async () => {
        if (!uid) {
          setIsLoadingHistory(false);
          return;
        }
        try {
          const analyses = await getRecentAnalyses(uid, 5);
          setRecentAnalyses(analyses);
        } catch (error) {
          console.error('Failed to load recent analyses:', error);
        } finally {
          setIsLoadingHistory(false);
        }
      };
      loadRecent();
    }, [uid])
  );

  const filteredExercises = searchQuery.trim()
    ? ALL_EXERCISES.filter((e) => e.toLowerCase().includes(searchQuery.toLowerCase()))
    : activeCategory
    ? EXERCISE_DATABASE.find((c) => c.category === activeCategory)?.exercises || []
    : [];

  const selectExercise = (exercise: string) => {
    setSelectedExercise(exercise);
    setStep('video');
  };

  const handlePickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다. 설정에서 허용해주세요.');
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
        Alert.alert('영상이 너무 길어요', '60초 이하의 영상을 선택해주세요.\n\n💡 팁: 1세트(3-5회)만 촬영하면 더 정확한 분석을 받을 수 있어요.');
        return;
      }
      setVideoUri(asset.uri);
      setVideoDuration(duration);
    }
  };

  const handleRecordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다. 설정에서 허용해주세요.');
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
      setVideoUri(asset.uri);
      setVideoDuration(duration);
    }
  };

  const handleSubmit = () => {
    if (!videoUri || !selectedExercise) return;

    // Gate: if no active subscription, redirect to paywall
    // NOTE: trial users are allowed for now (hasActiveSubscription includes trial)
    // TODO: Re-enable strict paywall after RevenueCat is configured
    if (!hasActiveSubscription()) {
      console.log('[DEBUG] Subscription check failed, but allowing for testing');
    }

    router.push({
      pathname: '/analysis/loading',
      params: {
        exerciseName: selectedExercise,
        videoUri: videoUri,
        source: 'standalone',
      },
    });
  };

  // Step 1: Exercise picker
  if (step === 'exercise') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>운동 분석</Text>
          <Text style={styles.headerSubtitle}>분석할 운동을 선택하세요</Text>
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 운동 검색"
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={(text) => { setSearchQuery(text); if (text.trim()) setActiveCategory(null); }}
          />
          {!searchQuery.trim() && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
              {EXERCISE_DATABASE.map((cat) => (
                <TouchableOpacity
                  key={cat.category}
                  style={[styles.categoryTab, activeCategory === cat.category && styles.categoryTabActive]}
                  onPress={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
                >
                  <Text style={[styles.categoryTabText, activeCategory === cat.category && styles.categoryTabTextActive]}>{cat.category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {!searchQuery.trim() && !activeCategory && (
            <View style={styles.promptContainer}>
              <Text style={styles.promptEmoji}>👆</Text>
              <Text style={styles.promptText}>카테고리를 선택하거나 운동을 검색하세요</Text>
            </View>
          )}
          {filteredExercises.length > 0 && (
            <View style={styles.exerciseGrid}>
              {filteredExercises.map((exercise) => (
                <TouchableOpacity key={exercise} style={styles.exerciseChip} onPress={() => selectExercise(exercise)}>
                  <Text style={styles.exerciseChipText}>{exercise}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {searchQuery.trim() && filteredExercises.length === 0 && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>검색 결과가 없습니다</Text>
              <TouchableOpacity style={styles.addCustomButton} onPress={() => selectExercise(searchQuery.trim())}>
                <Text style={styles.addCustomText}>"{searchQuery.trim()}" 으로 분석하기</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── 최근 분석 기록 ── */}
          <View style={styles.historyDivider} />
          <Text style={styles.historyTitle}>최근 분석 기록</Text>
          {isLoadingHistory ? (
            <ActivityIndicator color={Colors.textMuted} style={{ marginTop: 20 }} />
          ) : recentAnalyses.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Text style={styles.historyEmptyIcon}>📊</Text>
              <Text style={styles.historyEmptyTitle}>아직 분석 기록이 없어요</Text>
              <Text style={styles.historyEmptySubtitle}>운동을 선택하고 첫 AI 분석을 시작해보세요!</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {recentAnalyses.map((analysis) => (
                <TouchableOpacity
                  key={analysis.analysisId}
                  style={styles.historyItem}
                  onPress={() => router.push({
                    pathname: '/analysis/feedback',
                    params: { analysisId: analysis.analysisId },
                  })}
                  activeOpacity={0.7}
                >
                  <View style={styles.historyItemLeft}>
                    <Text style={styles.historyExerciseName}>{analysis.exerciseName}</Text>
                    <Text style={styles.historyDate}>
                      {analysis.createdAt instanceof Date
                        ? analysis.createdAt.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                        : ''}
                    </Text>
                  </View>
                  {analysis.feedback?.overallScore != null && (
                    <View style={[styles.historyScoreBadge, { backgroundColor: getScoreColor(analysis.feedback.overallScore) + '20' }]}>
                      <Text style={[styles.historyScore, { color: getScoreColor(analysis.feedback.overallScore) }]}>
                        {analysis.feedback.overallScore}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 2: Video picker
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { setStep('exercise'); setVideoUri(null); }}>
          <Text style={styles.backButton}>← 운동 선택</Text>
        </TouchableOpacity>
        <Text style={styles.exerciseLabel}>{selectedExercise}</Text>
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.videoContent}>
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>📹 촬영 팁</Text>
          <Text style={styles.tipText}>• 전신이 보이도록 촬영해주세요</Text>
          <Text style={styles.tipText}>• 밝은 곳에서 촬영하면 더 정확해요</Text>
          <Text style={styles.tipText}>• 슬로모션으로 촬영하면 더 정확한 분석을 받을 수 있어요!</Text>
          <Text style={styles.tipText}>• 1세트(3-5회)만 촬영하세요 (최대 60초)</Text>
        </View>
        {videoUri ? (
          <View style={styles.videoPreview}>
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoPlaceholderEmoji}>🎬</Text>
              <Text style={styles.videoPlaceholderText}>영상 선택됨</Text>
              <Text style={styles.videoDurationText}>{Math.round(videoDuration)}초</Text>
            </View>
            <TouchableOpacity style={styles.changeVideoButton} onPress={() => setVideoUri(null)}>
              <Text style={styles.changeVideoText}>다른 영상 선택</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.videoButtons}>
            <TouchableOpacity style={styles.videoButton} onPress={handleRecordVideo}>
              <Text style={styles.videoButtonEmoji}>📷</Text>
              <Text style={styles.videoButtonTitle}>촬영하기</Text>
              <Text style={styles.videoButtonSub}>카메라로 바로 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.videoButton} onPress={handlePickVideo}>
              <Text style={styles.videoButtonEmoji}>🖼️</Text>
              <Text style={styles.videoButtonTitle}>갤러리에서 선택</Text>
              <Text style={styles.videoButtonSub}>기존 영상 불러오기</Text>
            </TouchableOpacity>
          </View>
        )}
        {videoUri && (
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8}>
            <Text style={styles.submitButtonText}>AI 분석 시작 🚀</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary },
  backButton: { fontSize: 15, color: Colors.textSecondary, marginBottom: 8 },
  exerciseLabel: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  videoContent: { paddingHorizontal: 20, paddingBottom: 40 },
  searchInput: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  categoryScroll: { marginBottom: 16 },
  categoryContent: { gap: 8 },
  categoryTab: { backgroundColor: Colors.backgroundSecondary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  categoryTabActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  categoryTabText: { fontSize: 14, color: Colors.textSecondary },
  categoryTabTextActive: { color: Colors.primary, fontWeight: '600' },
  promptContainer: { alignItems: 'center', paddingVertical: 40 },
  promptEmoji: { fontSize: 32, marginBottom: 8 },
  promptText: { fontSize: 14, color: Colors.textMuted },
  exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exerciseChip: { backgroundColor: Colors.backgroundSecondary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  exerciseChipText: { fontSize: 13, color: Colors.textSecondary },
  noResults: { alignItems: 'center', paddingVertical: 20 },
  noResultsText: { fontSize: 14, color: Colors.textMuted, marginBottom: 12 },
  addCustomButton: { backgroundColor: Colors.primary + '20', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addCustomText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  // ── History section ──
  historyDivider: { height: 1, backgroundColor: Colors.border, marginTop: 24, marginBottom: 20 },
  historyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  historyEmpty: { backgroundColor: Colors.backgroundSecondary, borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  historyEmptyIcon: { fontSize: 36, marginBottom: 12 },
  historyEmptyTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  historyEmptySubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  historyList: { gap: 8 },
  historyItem: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.border },
  historyItemLeft: { flex: 1 },
  historyExerciseName: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  historyDate: { fontSize: 12, color: Colors.textMuted },
  historyScoreBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  historyScore: { fontSize: 16, fontWeight: '700' },
  // ── Video picker styles ──
  tipCard: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: Colors.border },
  tipTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  tipText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 22 },
  videoButtons: { gap: 12, marginBottom: 24 },
  videoButton: { backgroundColor: Colors.card, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  videoButtonEmoji: { fontSize: 32, marginBottom: 8 },
  videoButtonTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  videoButtonSub: { fontSize: 13, color: Colors.textSecondary },
  videoPreview: { alignItems: 'center', marginBottom: 24 },
  videoPlaceholder: { backgroundColor: Colors.backgroundSecondary, borderRadius: 16, width: '100%', aspectRatio: 9 / 16, maxHeight: 300, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  videoPlaceholderEmoji: { fontSize: 40, marginBottom: 8 },
  videoPlaceholderText: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  videoDurationText: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  changeVideoButton: { paddingVertical: 8 },
  changeVideoText: { fontSize: 14, color: Colors.primary },
  submitButton: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  submitButtonText: { fontSize: 18, fontWeight: '700', color: Colors.textOnPrimary },
});
