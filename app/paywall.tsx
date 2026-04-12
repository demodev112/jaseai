import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '@/lib/purchases';
import type { PurchasesPackage } from 'react-native-purchases';

type Plan = 'monthly' | 'annual';

export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const { setSubscriptionActive } = useAuthStore();

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offering = await getOfferings();
      if (offering) {
        // RevenueCat package identifiers
        const monthly = offering.availablePackages.find(
          (p) => p.packageType === 'MONTHLY',
        );
        const annual = offering.availablePackages.find(
          (p) => p.packageType === 'ANNUAL',
        );
        setMonthlyPackage(monthly || null);
        setAnnualPackage(annual || null);
      }
    } catch (error) {
      console.error('Failed to load offerings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;

    if (!pkg) {
      // Fallback if RevenueCat is not configured yet
      Alert.alert(
        '구독 준비 중',
        '구독 서비스가 아직 준비 중입니다. 곧 이용 가능합니다.',
      );
      return;
    }

    setIsPurchasing(true);
    try {
      const result = await purchasePackage(pkg);
      if (result.success) {
        setSubscriptionActive(true);
        Alert.alert(
          '구독 완료! 🎉',
          '자세ai Pro를 이용해주셔서 감사합니다.',
          [{ text: '시작하기', onPress: () => router.replace('/(tabs)/home') }],
        );
      } else if (result.error === 'cancelled') {
        // User cancelled — do nothing
      } else {
        Alert.alert('오류', result.error || '구매 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '구매 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const result = await restorePurchases();
      if (result.isActive) {
        setSubscriptionActive(true);
        Alert.alert(
          '복원 완료!',
          '구독이 복원되었습니다.',
          [{ text: '확인', onPress: () => router.replace('/(tabs)/home') }],
        );
      } else {
        Alert.alert('복원 결과', '활성화된 구독을 찾을 수 없습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '복원 중 오류가 발생했습니다.');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Format price from RevenueCat or use fallback
  const monthlyPrice = monthlyPackage?.product?.priceString || '₩9,900';
  const annualPrice = annualPackage?.product?.priceString || '₩47,520';
  const annualMonthly = annualPackage?.product?.price
    ? `월 ₩${Math.round(annualPackage.product.price / 12).toLocaleString()}으로 이용`
    : '월 ₩3,960으로 이용';

  return (
    <SafeAreaView style={styles.container}>
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI 자세 분석을 시작하세요</Text>
          <Text style={styles.subtitle}>7일 무료로 체험해보세요!</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {[
            { icon: '🤖', text: '무제한 AI 자세 분석 (일 20회)' },
            { icon: '📊', text: '상세한 피드백과 점수' },
            { icon: '🏋️', text: '루틴 관리 및 세션 기록' },
            { icon: '📈', text: '분석 히스토리 무제한 저장' },
          ].map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
        ) : (
          <>
            {/* Plans */}
            <View style={styles.plans}>
              {/* Annual plan — highlighted */}
              <TouchableOpacity
                style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
                onPress={() => setSelectedPlan('annual')}
                activeOpacity={0.8}
              >
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>60% 할인! 인기 가성비 플랜</Text>
                </View>
                <View style={styles.planContent}>
                  <View style={styles.planLeft}>
                    <View style={[styles.radioOuter, selectedPlan === 'annual' && styles.radioOuterSelected]}>
                      {selectedPlan === 'annual' && <View style={styles.radioInner} />}
                    </View>
                    <View>
                      <Text style={styles.planName}>연간 플랜</Text>
                      <Text style={styles.planPriceDetail}>{annualMonthly}</Text>
                    </View>
                  </View>
                  <View style={styles.planRight}>
                    <Text style={styles.planPrice}>{annualPrice}</Text>
                    <Text style={styles.planPeriod}>/년</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Monthly plan */}
              <TouchableOpacity
                style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
                onPress={() => setSelectedPlan('monthly')}
                activeOpacity={0.8}
              >
                <View style={styles.planContent}>
                  <View style={styles.planLeft}>
                    <View style={[styles.radioOuter, selectedPlan === 'monthly' && styles.radioOuterSelected]}>
                      {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
                    </View>
                    <View>
                      <Text style={styles.planName}>월간 플랜</Text>
                    </View>
                  </View>
                  <View style={styles.planRight}>
                    <Text style={styles.planPrice}>{monthlyPrice}</Text>
                    <Text style={styles.planPeriod}>/월</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Subscribe button */}
            <TouchableOpacity
              style={[styles.subscribeButton, isPurchasing && styles.subscribeButtonDisabled]}
              onPress={handleSubscribe}
              activeOpacity={0.8}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <>
                  <Text style={styles.subscribeButtonText}>7일 무료 체험 시작</Text>
                  <Text style={styles.subscribeButtonSub}>
                    {selectedPlan === 'annual'
                      ? `체험 후 연 ${annualPrice} · 언제든 취소 가능`
                      : `체험 후 월 ${monthlyPrice} · 언제든 취소 가능`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Restore + Terms */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} disabled={isPurchasing}>
          <Text style={styles.restoreText}>이전 구매 복원</Text>
        </TouchableOpacity>

        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://jaseai.rapidoverload.com/terms')}>
            <Text style={styles.legalText}>이용약관</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://jaseai.rapidoverload.com/privacy')}>
            <Text style={styles.legalText}>개인정보처리방침</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legalNote}>
          무료 체험 기간이 끝나면 자동으로 구독이 시작됩니다.{'\n'}
          구독은 언제든 설정에서 취소할 수 있습니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  closeButton: { position: 'absolute', top: 56, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center' },
  closeText: { fontSize: 18, color: Colors.textSecondary },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  features: { marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  featureIcon: { fontSize: 20, marginRight: 12 },
  featureText: { fontSize: 15, color: Colors.text },
  plans: { gap: 12, marginBottom: 24 },
  planCard: { backgroundColor: Colors.card, borderRadius: 16, borderWidth: 2, borderColor: Colors.border, overflow: 'hidden' },
  planCardSelected: { borderColor: Colors.primary },
  popularBadge: { backgroundColor: Colors.primary, paddingVertical: 6, alignItems: 'center' },
  popularBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.textOnPrimary },
  planContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.textMuted, justifyContent: 'center', alignItems: 'center' },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  planName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  planPriceDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  planRight: { flexDirection: 'row', alignItems: 'baseline' },
  planPrice: { fontSize: 22, fontWeight: '800', color: Colors.text },
  planPeriod: { fontSize: 14, color: Colors.textSecondary },
  subscribeButton: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 16 },
  subscribeButtonDisabled: { opacity: 0.7 },
  subscribeButtonText: { fontSize: 18, fontWeight: '700', color: Colors.textOnPrimary },
  subscribeButtonSub: { fontSize: 12, color: Colors.textOnPrimary + 'CC', marginTop: 4 },
  restoreButton: { alignItems: 'center', paddingVertical: 8, marginBottom: 16 },
  restoreText: { fontSize: 14, color: Colors.textSecondary, textDecorationLine: 'underline' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  legalText: { fontSize: 12, color: Colors.textMuted, textDecorationLine: 'underline' },
  legalDivider: { fontSize: 12, color: Colors.textMuted },
  legalNote: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
