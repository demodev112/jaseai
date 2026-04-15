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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { getAnalysis } from '@/lib/firestore';
import type { Analysis } from '@/types';

function getScoreColor(score: number): string {
  if (score >= 8) return Colors.scoreHigh;
  if (score >= 5) return Colors.scoreMedium;
  return Colors.scoreLow;
}

function getRiskColor(risk: string): string {
  if (risk === '낮음') return Colors.scoreHigh;
  if (risk === '보통') return Colors.scoreMedium;
  if (risk === '높음') return Colors.scoreLow;
  return Colors.textMuted;
}

function getRiskLabel(risk: string): string {
  return risk || '알 수 없음';
}

function formatDate(date: any): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function AnalysisDetailScreen() {
  const params = useLocalSearchParams<{ analysisId: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!params.analysisId) {
      setError('분석 ID가 없습니다.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getAnalysis(params.analysisId);
      if (!result) {
        setError('분석 결과를 찾을 수 없습니다.');
      } else {
        setAnalysis(result);
      }
    } catch (err: any) {
      console.error('Failed to fetch analysis:', err);
      setError('분석 결과를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [params.analysisId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // ─── Loading State ───────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>분석 상세</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error State ─────────────────────────────────────
  if (error || !analysis) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>분석 상세</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.errorTitle}>{error || '분석 결과를 찾을 수 없습니다.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAnalysis}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
            <Text style={styles.goBackText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Data ────────────────────────────────────────────
  const feedback = analysis.feedback;
  const score = feedback?.overallScore;
  const sourceLabel = analysis.source === 'routine' ? '루틴' : '단독 분석';

  // ─── Main Content ────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>분석 상세</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top section */}
        <View style={styles.topSection}>
          <Text style={styles.exerciseName}>{analysis.exerciseName}</Text>
          <Text style={styles.dateText}>{formatDate(analysis.createdAt)} · {sourceLabel}</Text>
          {score !== null && score !== undefined ? (
            <View style={[styles.scoreBadge, { borderColor: getScoreColor(score) }]}>
              <Text style={[styles.scoreNumber, { color: getScoreColor(score) }]}>{score}</Text>
              <Text style={styles.scoreMax}>/10</Text>
            </View>
          ) : (
            <View style={[styles.scoreBadge, { borderColor: Colors.textTertiary }]}>
              <Text style={[styles.scoreNumber, { color: Colors.textTertiary }]}>-</Text>
              <Text style={styles.scoreMax}>/10</Text>
            </View>
          )}
        </View>

        {/* Low confidence warning */}
        {feedback?.videoQuality?.analysisConfidence === 'low' && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>⚠️ 영상 품질 주의</Text>
            {feedback.videoQuality.qualityIssues?.map((issue: string, idx: number) => (
              <Text key={idx} style={styles.warningText}>• {issue}</Text>
            ))}
          </View>
        )}

        {/* Summary */}
        {feedback?.summary && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 종합 평가</Text>
            <Text style={styles.cardBody}>{feedback.summary}</Text>
          </View>
        )}

        {/* Good points */}
        {feedback?.goodPoints && feedback.goodPoints.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✅ 잘한 점</Text>
            {feedback.goodPoints.map((point: string, idx: number) => (
              <View key={idx} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.listText}>{point}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Improvements */}
        {feedback?.improvements && feedback.improvements.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚠️ 개선할 점</Text>
            {feedback.improvements.map((item: any, idx: number) => (
              <View key={idx} style={styles.improvementItem}>
                <Text style={styles.improvementIssue}>{item.issue || item.title}</Text>
                {item.timestamp && (
                  <Text style={styles.timestamp}>⏱ {item.timestamp}</Text>
                )}
                <Text style={styles.improvementDetail}>
                  {item.correction || item.detail || item.description}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Injury risk */}
        {feedback?.injuryRisk && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🩺 부상 위험도</Text>
            <View style={styles.riskRow}>
              <View style={[styles.riskBadge, { backgroundColor: getRiskColor(feedback.injuryRisk) + '20' }]}>
                <Text style={[styles.riskText, { color: getRiskColor(feedback.injuryRisk) }]}>
                  {getRiskLabel(feedback.injuryRisk)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Overall advice */}
        {feedback?.overallAdvice && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💡 종합 조언</Text>
            <Text style={styles.cardBody}>{feedback.overallAdvice}</Text>
          </View>
        )}

        <Text style={styles.disclaimer}>
          ⚕️ 이 분석은 AI 기반 참고 자료이며, 전문 트레이너의 조언을 대체하지 않습니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { fontSize: 15, color: Colors.textSecondary, marginTop: 16 },
  errorTitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginTop: 16, marginBottom: 24, lineHeight: 24 },
  retryButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginBottom: 12 },
  retryText: { fontSize: 16, fontWeight: '600', color: Colors.textOnPrimary },
  goBackButton: { paddingVertical: 8 },
  goBackText: { fontSize: 14, color: Colors.textSecondary },
  topSection: { alignItems: 'center', marginBottom: 24 },
  exerciseName: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  dateText: { fontSize: 13, color: Colors.textMuted, marginBottom: 16 },
  scoreBadge: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  scoreNumber: { fontSize: 30, fontWeight: '800' },
  scoreMax: { fontSize: 12, color: Colors.textTertiary, marginTop: -2 },
  warningCard: { backgroundColor: '#3D2E00', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#665000' },
  warningTitle: { fontSize: 16, fontWeight: '700', color: '#FFD60A', marginBottom: 8 },
  warningText: { fontSize: 14, color: '#FFD60A', lineHeight: 22, opacity: 0.85 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  cardBody: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  listItem: { flexDirection: 'row', marginBottom: 6 },
  bullet: { fontSize: 14, color: Colors.primary, marginRight: 8, marginTop: 1 },
  listText: { fontSize: 14, color: Colors.textSecondary, flex: 1, lineHeight: 22 },
  improvementItem: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 14, marginBottom: 8 },
  improvementIssue: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  timestamp: { fontSize: 13, color: Colors.primary, marginBottom: 6 },
  improvementDetail: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  riskRow: { flexDirection: 'row' },
  riskBadge: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  riskText: { fontSize: 15, fontWeight: '700' },
  disclaimer: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
