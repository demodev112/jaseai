import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import { getUserAnalyses, getUserRoutines } from '@/lib/firestore';
import type { Analysis } from '@/types';

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [totalRoutines, setTotalRoutines] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!user?.uid) return;
    try {
      const [allAnalyses, routines] = await Promise.all([
        getUserAnalyses(user.uid, 100),
        getUserRoutines(user.uid),
      ]);
      setAnalyses(allAnalyses);
      setTotalRoutines(routines.length);
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.uid])
  );

  const totalAnalyses = analyses.length;
  const avgScore = totalAnalyses > 0
    ? Math.round((analyses.reduce((sum, a) => sum + (a.feedback?.overallScore ?? 0), 0) / totalAnalyses) * 10) / 10
    : 0;

  const recentAnalyses = analyses.slice(0, 5);

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.displayName || '사용자')[0]}</Text>
          </View>
          <Text style={styles.displayName}>{user?.displayName || '사용자'}님</Text>
          <View style={styles.subscriptionBadge}>
            <Text style={styles.subscriptionText}>
              {user?.subscription?.status === 'active' ? 'Pro 구독 중' : '체험 중'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalAnalyses}</Text>
            <Text style={styles.statLabel}>총 분석</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.primary }]}>{avgScore}</Text>
            <Text style={styles.statLabel}>평균 점수</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalRoutines}</Text>
            <Text style={styles.statLabel}>루틴</Text>
          </View>
        </View>

        {/* Recent analyses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 분석</Text>
          </View>
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
          ) : recentAnalyses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>아직 분석 기록이 없어요.</Text>
            </View>
          ) : (
            recentAnalyses.map((item) => (
              <TouchableOpacity
                key={item.analysisId}
                style={styles.analysisItem}
                onPress={() => router.push({ pathname: '/analysis/detail', params: { analysisId: item.analysisId } })}
              >
                <View style={[styles.scoreCircle, { borderColor: (item.feedback?.overallScore ?? 0) >= 8 ? Colors.scoreHigh : (item.feedback?.overallScore ?? 0) >= 5 ? Colors.scoreMedium : Colors.scoreLow }]}>
                  <Text style={[styles.scoreText, { color: (item.feedback?.overallScore ?? 0) >= 8 ? Colors.scoreHigh : (item.feedback?.overallScore ?? 0) >= 5 ? Colors.scoreMedium : Colors.scoreLow }]}>
                    {item.feedback?.overallScore ?? '-'}
                  </Text>
                </View>
                <View style={styles.analysisInfo}>
                  <Text style={styles.analysisExercise}>{item.exerciseName}</Text>
                  <Text style={styles.analysisDate}>
                    {formatDate(item.createdAt as any)} · {item.source === 'routine' ? '루틴' : '단독 분석'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Menu items */}
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/profile/settings')}>
            <Text style={styles.menuIcon}>⚙️</Text>
            <Text style={styles.menuText}>설정</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/paywall')}>
            <Text style={styles.menuIcon}>💎</Text>
            <Text style={styles.menuText}>구독 관리</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary + '30', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '700', color: Colors.primary },
  displayName: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  subscriptionBadge: { backgroundColor: Colors.primary + '20', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  subscriptionText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statNumber: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  emptyState: { backgroundColor: Colors.card, borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  analysisItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  scoreCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  scoreText: { fontSize: 16, fontWeight: '800' },
  analysisInfo: { flex: 1 },
  analysisExercise: { fontSize: 15, fontWeight: '600', color: Colors.text },
  analysisDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 20, color: Colors.textMuted },
  menu: { gap: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  menuIcon: { fontSize: 18, marginRight: 12 },
  menuText: { flex: 1, fontSize: 15, color: Colors.text },
});
