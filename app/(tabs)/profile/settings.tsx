import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import { deleteUserAccount } from '@/lib/firestore';
import { auth } from '@/lib/firebase';
import { openManageSubscriptions } from '@/lib/purchases';

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/');
            } catch (error) {
              Alert.alert('오류', '로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '정말 삭제하시겠어요?',
              '마지막 확인입니다. 모든 분석 기록, 루틴, 구독 정보가 삭제됩니다.',
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '영구 삭제',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      if (auth.currentUser) {
                        await deleteUserAccount(auth.currentUser.uid);
                        await auth.currentUser.delete();
                      }
                      await signOut();
                      router.replace('/');
                    } catch (error) {
                      Alert.alert('오류', '계정 삭제 중 오류가 발생했습니다. 다시 로그인 후 시도해주세요.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Account section */}
        <Text style={styles.sectionLabel}>계정</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>이름</Text>
            <Text style={styles.settingValue}>{user?.username || '사용자'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>이메일</Text>
            <Text style={styles.settingValue}>{auth.currentUser?.email || '-'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>로그인 방법</Text>
            <Text style={styles.settingValue}>
              {auth.currentUser?.providerData?.[0]?.providerId === 'google.com' ? 'Google' : auth.currentUser?.providerData?.[0]?.providerId === 'apple.com' ? 'Apple' : 'Kakao'}
            </Text>
          </View>
        </View>

        {/* Subscription section */}
        <Text style={styles.sectionLabel}>구독</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/paywall')}>
            <Text style={styles.settingLabel}>구독 상태</Text>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>
                {user?.subscription?.status === 'active' ? 'Pro 구독 중' : '체험 중'}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} onPress={openManageSubscriptions}>
            <Text style={styles.settingLabel}>구독 관리</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Support section */}
        <Text style={styles.sectionLabel}>지원</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingRow} onPress={() => Linking.openURL('mailto:RO@rapidoverload.com')}>
            <Text style={styles.settingLabel}>문의하기</Text>
            <Text style={styles.settingValueSmall}>RO@rapidoverload.com</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/privacy')}>
            <Text style={styles.settingLabel}>개인정보처리방침</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/terms')}>
            <Text style={styles.settingLabel}>이용약관</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* App info */}
        <Text style={styles.sectionLabel}>앱 정보</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>버전</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>

        {/* Danger zone */}
        <View style={styles.dangerZone}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteText}>계정 삭제</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { fontSize: 15, color: Colors.textSecondary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 8, marginTop: 16, marginLeft: 4 },
  card: { backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  settingLabel: { fontSize: 15, color: Colors.text },
  settingValue: { fontSize: 14, color: Colors.textSecondary },
  settingValueSmall: { fontSize: 12, color: Colors.textMuted },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chevron: { fontSize: 18, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  dangerZone: { marginTop: 32, gap: 12 },
  signOutButton: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  signOutText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  deleteButton: { paddingVertical: 12, alignItems: 'center' },
  deleteText: { fontSize: 14, color: Colors.scoreLow },
});
