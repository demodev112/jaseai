import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import { getRecentAnalyses } from '@/lib/firestore';
import type { Analysis } from '@/types';

function getScoreColor(score: number): string {
  if (score >= 8) return Colors.scoreHigh;
  if (score >= 5) return Colors.scoreMedium;
  return Colors.scoreLow;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchAnalyses = useCallback(async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    setFetchError(false);
    try {
      const analyses = await getRecentAnalyses(user.uid, 5);
      setRecentAnalyses(analyses);
    } catch (error) {
      console.error('Failed to fetch analyses:', error);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchAnalyses();
    }, [fetchAnalyses])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAnalyses();
    setIsRefreshing(false);
  };

  const handleStartAnalysis = () => {
    router.push('/(tabs)/analyze');
  };

  const handleViewAnalysis = (analysis: Analysis) => {
    router.push({
      pathname: '/analysis/detail',
      params: { analysisId: analysis.analysisId },
    });
  };

  const renderAnalysisItem = ({ item }: { item: Analysis }) => {
    const score = item.feedback?.overallScore;
    const source = item.source === 'routine' ? '루틴' : '단독 분석';

    return (
      <TouchableOpacity
        style={styles.analysisCard}
        onPress={() => handleViewAnalysis(item)}
        activeOpacity={0.7}
      >
        <View style={styles.analysisLeft}>
          {score !== null && score !== undefined ? (
            <View style={[styles.scoreBadge, { borderColor: getScoreColor(score) }]}>
              <Text style={[styles.scoreText, { color: getScoreColor(score) }]}>{score}</Text>
            </View>
          ) : (
            <View style={[styles.scoreBadge, { borderColor: Colors.textTertiary }]}>
              <Text style={[styles.scoreText, { color: Colors.textTertiary }]}>-</Text>
            </View>
          )}
        </View>
        <View style={styles.analysisCenter}>
          <Text style={styles.exerciseName}>{item.exerciseName}</Text>
          <Text style={styles.analysisDate}>{formatDate(item.createdAt)} · {source}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }
    if (fetchError) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyTitle}>데이터를 불러올 수 없어요</Text>
          <Text style={styles.emptySubtitle}>네트워크를 확인하고 다시 시도해주세요.</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={styles.emptyTitle}>아직 분석 기록이 없어요.</Text>
        <Text style={styles.emptySubtitle}>첫 번째 운동을 분석해보세요!</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={recentAnalyses}
        keyExtractor={(item) => item.analysisId}
        renderItem={renderAnalysisItem}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.greetingRow}>
              <View>
                <Text style={styles.greeting}>안녕하세요 👋</Text>
                <Text style={styles.username}>{user?.username || '사용자'}님</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.ctaButton} onPress={handleStartAnalysis} activeOpacity={0.8}>
              <Text style={styles.ctaEmoji}>🎬</Text>
              <Text style={styles.ctaText}>분석 시작</Text>
            </TouchableOpacity>

            {recentAnalyses.length > 0 && (
              <Text style={styles.sectionTitle}>최근 분석</Text>
            )}
          </View>
        }
        ListFooterComponent={
          recentAnalyses.length > 0 ? (
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>전체 기록 보기 ›</Text>
            </TouchableOpacity>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 },
  header: { paddingTop: 12 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 16, color: Colors.textSecondary, marginBottom: 4 },
  username: { fontSize: 24, fontWeight: '700', color: Colors.text },
  ctaButton: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 28 },
  ctaEmoji: { fontSize: 20 },
  ctaText: { fontSize: 18, fontWeight: '700', color: Colors.textOnPrimary },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12 },
  analysisCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  analysisLeft: { marginRight: 14 },
  scoreBadge: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  scoreText: { fontSize: 18, fontWeight: '700' },
  analysisCenter: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  analysisDate: { fontSize: 13, color: Colors.textTertiary },
  chevron: { fontSize: 20, color: Colors.textTertiary, marginLeft: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: Colors.textTertiary },
  viewAllButton: { alignItems: 'center', paddingVertical: 16 },
  viewAllText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
});
