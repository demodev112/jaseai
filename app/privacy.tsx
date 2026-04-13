import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보처리방침</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>자세 AI 개인정보처리방침</Text>
        <Text style={styles.date}>시행일: 2024년 5월 1일</Text>

        <Text style={styles.sectionTitle}>1. 개인정보의 처리 목적</Text>
        <Text style={styles.paragraph}>
          자세 AI(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.{'\n'}
          - 회원 가입 및 관리: 회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지, 고충처리 등{'\n'}
          - 재화 또는 서비스 제공: 서비스 제공, 청구서 발송, 콘텐츠 제공, 맞춤서비스 제공, 본인인증, 연령인증, 요금결제·정산 등
        </Text>

        <Text style={styles.sectionTitle}>2. 처리하는 개인정보 항목</Text>
        <Text style={styles.paragraph}>
          회사는 회원가입, 원활한 고객상담, 각종 서비스의 제공을 위해 최초 회원가입 당시 아래와 같은 최소한의 개인정보를 필수항목으로 수집하고 있습니다.{'\n'}
          - 필수항목: 이메일 주소, 비밀번호, 이름, 닉네임, 프로필 사진, 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보, 결제기록{'\n'}
          - 선택항목: 성별, 생년월일, 신장, 체중 등 신체 정보 (맞춤형 서비스 제공 목적)
        </Text>

        <Text style={styles.sectionTitle}>3. 개인정보의 처리 및 보유기간</Text>
        <Text style={styles.paragraph}>
          회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.{'\n'}
          - 회원 가입 및 관리: 사업자/단체 홈페이지 탈퇴 시까지{'\n'}
          - 다만, 다음의 사유에 해당하는 경우에는 해당 사유 종료 시까지{'\n'}
          1) 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 수사·조사 종료 시까지{'\n'}
          2) 홈페이지 이용에 따른 채권·채무관계 잔존 시에는 해당 채권·채무관계 정산 시까지
        </Text>

        <Text style={styles.sectionTitle}>4. 개인정보의 제3자 제공</Text>
        <Text style={styles.paragraph}>
          회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
        </Text>

        <Text style={styles.sectionTitle}>5. 개인정보처리의 위탁</Text>
        <Text style={styles.paragraph}>
          회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.{'\n'}
          - 수탁자: Google LLC (Firebase, Google Cloud Platform){'\n'}
          - 위탁하는 업무의 내용: 데이터 보관, 서버 호스팅, AI 분석 서비스 제공
        </Text>

        <Text style={styles.sectionTitle}>6. 정보주체의 권리·의무 및 행사방법</Text>
        <Text style={styles.paragraph}>
          정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.{'\n'}
          1. 개인정보 열람요구{'\n'}
          2. 오류 등이 있을 경우 정정 요구{'\n'}
          3. 삭제요구{'\n'}
          4. 처리정지 요구
        </Text>

        <Text style={styles.sectionTitle}>7. 개인정보의 파기</Text>
        <Text style={styles.paragraph}>
          회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
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
