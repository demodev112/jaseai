import React, { useEffect, useState } from 'react';
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
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import { getAnalysis } from '@/lib/firestore';
import type { Analysis, AnalysisFeedback } from '@/types';

function getScoreColor(score: number): string {
  if (score >= 8) return Colors.scoreHigh;
  if (score >= 5) return Colors.scoreMedium;
  return Colors.scoreLow;
}

function getRiskColor(risk: string): string {
  if (risk === '낮음') return Colors.riskLow;
  if (risk === '보통') return Colors.riskMedium;
  return Colors.riskHigh;
}

export default function AnalysisFeedbackScreen() {
  const params = useLocalSearchParams<{
    exerciseName: string;
    source: string;
    routineId?: string;
    sessionIndex?: string;
    analysisId: string;
  }>();

  const { user } = useAuthStore();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!user?.uid || !params.analysisId) return;
      try {
        const data = await getAnalysis(params.analysisId);
        setAnalysis(data);
      } catch (error) {
        console.error('Failed to fetch analysis:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalysis();
  }, [user?.uid, params.analysisId]);

  const handleDone = () => {
    if (params.source === 'routine' && params.routineId) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const feedback = analysis?.feedback;
  if (!feedback) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>분석 결과를 불러올 수 없습니다.</Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => router.replace('/(tabs)/home')}>
            <Text style={styles.doneButtonText}>홈으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Low confidence — show quality issue screen
  if (feedback.videoQuality.analysisConfidence === 'low') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.exerciseName}>{params.exerciseName || analysis?.exerciseName}</Text>
          </View>
          <View style={styles.qualityIssueContainer}>
            <Text style={styles.qualityIssueEmoji}>⚠️</Text>
            <Text style={styles.qualityIssueTitle}>정확한 분석이 어려워요</Text>
            <Text style={styles.qualityIssueSubtitle}>다음 사항을 확인 후 다시 촬영해주세요:</Text>
            {feedback.videoQuality.qualityIssues.map((issue, idx) => (
              <View key={idx} style={styles.issueItem}>
                <Text style={styles.issueBullet}>•</Text>
                <Text style={styles.issueText}>{issue}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>다시 촬영하기</Text>
          </TouchableOpacity>
          <Text style={styles.noChargeText}>이 분석은 일일 횟수에 포함되지 않았어요.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const score = feedback.overallScore ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.exerciseName}>{params.exerciseName || analysis?.exerciseName}</Text>
          <Text style={styles.analysisLabel}>AI 분석 결과</Text>
        </View>

        <View style={styles.scoreContainer}>
          <View style={[styles.scoreBadge, { borderColor: getScoreColor(score) }]}>
            <Text style={[styles.scoreNumber, { color: getScoreColor(score) }]}>{score}</Text>
            <Text style={styles.scoreMax}>/10</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 종합 평가</Text>
          <Text style={styles.summaryText}>{feedback.summary}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ 잘한 점</Text>
          {feedback.goodPoints.map((point, idx) => (
            <View key={idx} style={styles.listItem}>
              <Text style={styles.listBullet}>•</Text>
              <Text style={styles.listText}>{point}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚠️ 개선할 점</Text>
          {feedback.improvements.map((item, idx) => (
            <View key={idx} style={styles.improvementItem}>
              <View style={styles.improvementHeader}>
                <Text style={styles.improvementIssue}>{item.issue}</Text>
                <View style={[styles.severityBadge, { backgroundColor: item.severity === '주의' ? Colors.warning + '20' : Colors.info + '20' }]}>
                  <Text style={[styles.severityText, { color: item.severity === '주의' ? Colors.warning : Colors.info }]}>{item.severity}</Text>
                </View>
              </View>
              <Text style={styles.timestamp}>⏱ {item.timestamp}</Text>
              <Text style={styles.improvementDetail}>{item.detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🩺 부상 위험도</Text>
          <View style={styles.riskRow}>
            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(feedback.injuryRisk) + '20' }]}>
              <Text style={[styles.riskText, { color: getRiskColor(feedback.injuryRisk) }]}>{feedback.injuryRisk}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💡 종합 조언</Text>
          <Text style={styles.adviceText}>{feedback.overallAdvice}</Text>
        </View>

        <Text style={styles.disclaimer}>
          ⚕️ 이 분석은 AI 기반 참고 자료이며, 전문 트레이너의 조언을 대체하지 않습니다. 통증이 있는 경우 전문가와 상담하세요.
        </Text>

        <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
          <Text style={styles.doneButtonText}>
            {params.source === 'routine' ? '다음 운동으로' : '홈으로 돌아가기'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  errorText: { fontSize: 16, color: Colors.textSecondary, marginBottom: 24 },
  header: { alignItems: 'center', marginBottom: 20 },
  exerciseName: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  analysisLabel: { fontSize: 14, color: Colors.textSecondary },
  scoreContainer: { alignItems: 'center', marginBottom: 24 },
  scoreBadge: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  scoreNumber: { fontSize: 36, fontWeight: '800' },
  scoreMax: { fontSize: 14, color: Colors.textTertiary, marginTop: -4 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  summaryText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  listItem: { flexDirection: 'row', marginBottom: 6 },
  listBullet: { fontSize: 14, color: Colors.primary, marginRight: 8, marginTop: 1 },
  listText: { fontSize: 14, color: Colors.textSecondary, flex: 1, lineHeight: 22 },
  improvementItem: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 14, marginBottom: 8 },
  improvementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  improvementIssue: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  severityBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  severityText: { fontSize: 12, fontWeight: '600' },
  timestamp: { fontSize: 13, color: Colors.primary, marginBottom: 6 },
  improvementDetail: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  riskRow: { flexDirection: 'row' },
  riskBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  riskText: { fontSize: 14, fontWeight: '700' },
  adviceText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  disclaimer: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 18 },
  doneButton: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  doneButtonText: { fontSize: 16, fontWeight: '700', color: Colors.textOnPrimary },
  // Quality issue styles
  qualityIssueContainer: { alignItems: 'center', paddingVertical: 40 },
  qualityIssueEmoji: { fontSize: 48, marginBottom: 16 },
  qualityIssueTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  qualityIssueSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },
  issueItem: { flexDirection: 'row', width: '100%', paddingHorizontal: 20, marginBottom: 8 },
  issueBullet: { fontSize: 14, color: Colors.warning, marginRight: 8 },
  issueText: { fontSize: 14, color: Colors.textSecondary, flex: 1, lineHeight: 22 },
  retryButton: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 20 },
  retryButtonText: { fontSize: 16, fontWeight: '700', color: Colors.textOnPrimary },
  noChargeText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 12 },
});
