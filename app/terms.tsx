import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>이용약관</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>자세 AI 서비스 이용약관</Text>
        <Text style={styles.date}>시행일: 2024년 5월 1일</Text>

        <Text style={styles.sectionTitle}>제1조 (목적)</Text>
        <Text style={styles.paragraph}>
          본 약관은 자세 AI(이하 "회사")가 제공하는 자세 AI 모바일 애플리케이션 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
        </Text>

        <Text style={styles.sectionTitle}>제2조 (용어의 정의)</Text>
        <Text style={styles.paragraph}>
          1. "서비스"라 함은 구현되는 단말기(PC, TV, 휴대형단말기 등의 각종 유무선 장치를 포함)와 상관없이 "회원"이 이용할 수 있는 자세 AI 관련 제반 서비스를 의미합니다.{'\n'}
          2. "회원"이라 함은 회사의 "서비스"에 접속하여 본 약관에 따라 "회사"와 이용계약을 체결하고 "회사"가 제공하는 "서비스"를 이용하는 고객을 말합니다.{'\n'}
          3. "유료서비스"라 함은 "회사"가 유료로 제공하는 각종 온라인디지털콘텐츠(자세 분석 등) 및 제반 서비스를 의미합니다.
        </Text>

        <Text style={styles.sectionTitle}>제3조 (약관의 게시와 개정)</Text>
        <Text style={styles.paragraph}>
          1. "회사"는 이 약관의 내용을 "회원"이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.{'\n'}
          2. "회사"는 "약관의 규제에 관한 법률", "정보통신망 이용촉진 및 정보보호 등에 관한 법률(이하 "정보통신망법")" 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>제4조 (이용계약 체결)</Text>
        <Text style={styles.paragraph}>
          1. 이용계약은 "회원"이 되고자 하는 자(이하 "가입신청자")가 약관의 내용에 대하여 동의를 한 다음 회원가입신청을 하고 "회사"가 이러한 신청에 대하여 승낙함으로써 체결됩니다.{'\n'}
          2. "회사"는 "가입신청자"의 신청에 대하여 "서비스" 이용을 승낙함을 원칙으로 합니다. 다만, "회사"는 다음 각 호에 해당하는 신청에 대하여는 승낙을 하지 않거나 사후에 이용계약을 해지할 수 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>제5조 (회원의 의무)</Text>
        <Text style={styles.paragraph}>
          1. "회원"은 다음 행위를 하여서는 안 됩니다.{'\n'}
          - 신청 또는 변경 시 허위내용의 등록{'\n'}
          - 타인의 정보도용{'\n'}
          - "회사"가 게시한 정보의 변경{'\n'}
          - "회사"와 기타 제3자의 저작권 등 지적재산권에 대한 침해{'\n'}
          - "회사" 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위
        </Text>

        <Text style={styles.sectionTitle}>제6조 (서비스의 제공 등)</Text>
        <Text style={styles.paragraph}>
          1. 회사는 회원에게 아래와 같은 서비스를 제공합니다.{'\n'}
          - AI 기반 운동 자세 분석 서비스{'\n'}
          - 운동 루틴 관리 서비스{'\n'}
          - 기타 회사가 추가 개발하거나 다른 회사와의 제휴계약 등을 통해 회원에게 제공하는 일체의 서비스
        </Text>

        <Text style={styles.sectionTitle}>제7조 (유료서비스의 이용)</Text>
        <Text style={styles.paragraph}>
          1. 회사가 제공하는 AI 자세 분석 서비스는 유료로 제공됩니다.{'\n'}
          2. 유료서비스의 이용요금, 결제방식, 환불 등은 회사가 별도로 정한 정책(결제 화면 등에 명시)에 따릅니다.{'\n'}
          3. 회원은 Apple App Store 또는 Google Play Store의 결제 시스템을 통해 결제하며, 해당 스토어의 정책을 따릅니다.
        </Text>

        <Text style={styles.sectionTitle}>제8조 (면책조항)</Text>
        <Text style={styles.paragraph}>
          1. 회사가 제공하는 AI 자세 분석 결과는 참고용이며, 의학적 진단이나 전문적인 의료 조언을 대체하지 않습니다.{'\n'}
          2. 회원은 본인의 건강 상태와 체력에 맞게 운동을 수행해야 하며, 서비스 이용 중 발생한 부상이나 손해에 대해 회사는 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.
        </Text>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  footer: {
    height: 40,
  },
});
