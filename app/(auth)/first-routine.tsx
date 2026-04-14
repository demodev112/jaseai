import React, { useState } from 'react';
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
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { EXERCISE_DATABASE, ALL_EXERCISES } from '@/constants/Exercises';
import { useAuthStore } from '@/stores/authStore';
import { createRoutine } from '@/lib/firestore';
import { auth } from '@/lib/firebase';

// Popular exercises shown as quick-add chips
const POPULAR_EXERCISES = [
  '스쿼트', '벤치프레스', '데드리프트', '오버헤드프레스',
  '바벨 로우', '풀업', '런지', '덤벨컬',
  '레그프레스', '사이드 레터럴 레이즈', '딥스', '힙 쓰러스트',
];

export default function FirstRoutineScreen() {
  const { user, setOnboardingComplete } = useAuthStore();
  // Get uid from Firebase Auth directly as fallback (auth store may not be fully hydrated during onboarding)
  const uid = user?.uid || auth.currentUser?.uid;
  const [routineName, setRoutineName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toggleExercise = (exercise: string) => {
    setSelectedExercises((prev) =>
      prev.includes(exercise)
        ? prev.filter((e) => e !== exercise)
        : [...prev, exercise]
    );
  };

  const filteredExercises = searchQuery.trim()
    ? ALL_EXERCISES.filter((e) =>
        e.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSave = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert('운동을 추가해주세요', '최소 1개의 운동을 선택해주세요.');
      return;
    }

    if (!uid) {
      Alert.alert('오류', '로그인 정보를 찾을 수 없습니다. 앱을 다시 시작해주세요.');
      return;
    }

    const name = routineName.trim() || '나의 루틴';

    setIsSaving(true);
    try {
      // Save routine to Firestore
      const exercises = selectedExercises.map((exerciseName, idx) => ({
        order: idx,
        name: exerciseName,
      }));
      await createRoutine(uid, name, exercises);

      // Mark onboarding as complete
      setOnboardingComplete();

      // Navigate to main app
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Failed to save routine:', error);
      Alert.alert('오류', '루틴 저장 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    // Even if skipping, mark onboarding as complete so user isn't stuck
    setOnboardingComplete();
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>첫 번째 루틴을 만들어보세요!</Text>
          <Text style={styles.subtitle}>
            오늘 할 운동을 추가하면{'\n'}AI가 자세를 분석해드려요
          </Text>
        </View>

        {/* Routine name input */}
        <TextInput
          style={styles.nameInput}
          placeholder="루틴 이름 (예: 하체 데이)"
          placeholderTextColor={Colors.textMuted}
          value={routineName}
          onChangeText={setRoutineName}
          maxLength={30}
        />

        {/* Selected exercises */}
        {selectedExercises.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.sectionTitle}>
              선택한 운동 ({selectedExercises.length})
            </Text>
            <View style={styles.selectedList}>
              {selectedExercises.map((exercise, index) => (
                <View key={exercise} style={styles.selectedItem}>
                  <Text style={styles.selectedIndex}>{index + 1}</Text>
                  <Text style={styles.selectedName}>{exercise}</Text>
                  <TouchableOpacity
                    onPress={() => toggleExercise(exercise)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.removeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Search */}
        <TouchableOpacity
          style={styles.searchToggle}
          onPress={() => setShowSearch(!showSearch)}
        >
          <Text style={styles.searchToggleText}>
            {showSearch ? '인기 운동 보기' : '🔍 운동 검색하기'}
          </Text>
        </TouchableOpacity>

        {showSearch ? (
          <View style={styles.searchSection}>
            <TextInput
              style={styles.searchInput}
              placeholder="운동 이름을 검색하세요"
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {filteredExercises.length > 0 && (
              <View style={styles.searchResults}>
                {filteredExercises.map((exercise) => (
                  <TouchableOpacity
                    key={exercise}
                    style={[
                      styles.searchResultItem,
                      selectedExercises.includes(exercise) &&
                        styles.searchResultItemSelected,
                    ]}
                    onPress={() => toggleExercise(exercise)}
                  >
                    <Text
                      style={[
                        styles.searchResultText,
                        selectedExercises.includes(exercise) &&
                          styles.searchResultTextSelected,
                      ]}
                    >
                      {exercise}
                    </Text>
                    {selectedExercises.includes(exercise) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {searchQuery.trim().length > 0 && filteredExercises.length === 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>
                  검색 결과가 없습니다
                </Text>
                <TouchableOpacity
                  style={styles.addCustomButton}
                  onPress={() => {
                    toggleExercise(searchQuery.trim());
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.addCustomText}>
                    "{searchQuery.trim()}" 직접 추가하기
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* Popular exercise chips */
          <View style={styles.chipsSection}>
            <Text style={styles.sectionTitle}>인기 운동</Text>
            <View style={styles.chipsGrid}>
              {POPULAR_EXERCISES.map((exercise) => (
                <TouchableOpacity
                  key={exercise}
                  style={[
                    styles.chip,
                    selectedExercises.includes(exercise) && styles.chipSelected,
                  ]}
                  onPress={() => toggleExercise(exercise)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedExercises.includes(exercise) &&
                        styles.chipTextSelected,
                    ]}
                  >
                    {selectedExercises.includes(exercise) ? '✓ ' : '+ '}
                    {exercise}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (selectedExercises.length === 0 || isSaving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={selectedExercises.length === 0 || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text
              style={[
                styles.saveButtonText,
                selectedExercises.length === 0 && styles.saveButtonTextDisabled,
              ]}
            >
              루틴 저장하고 시작하기
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} disabled={isSaving}>
          <Text style={styles.skipButtonText}>나중에 만들기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  nameInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  // Selected exercises
  selectedSection: {
    marginBottom: 20,
  },
  selectedList: {
    gap: 8,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  selectedIndex: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    width: 24,
  },
  selectedName: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  removeButton: {
    fontSize: 14,
    color: Colors.textMuted,
    padding: 4,
  },
  // Search toggle
  searchToggle: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchToggleText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  // Search section
  searchSection: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  searchResults: {
    gap: 4,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
  },
  searchResultItemSelected: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  searchResultText: {
    fontSize: 15,
    color: Colors.text,
  },
  searchResultTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noResultsText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  addCustomButton: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addCustomText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  // Chips
  chipsSection: {
    marginBottom: 20,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  // Bottom buttons
  bottomButtons: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.backgroundTertiary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
  saveButtonTextDisabled: {
    color: Colors.textMuted,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
