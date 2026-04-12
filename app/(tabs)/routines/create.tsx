import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/Colors';
import { EXERCISE_DATABASE, ALL_EXERCISES } from '@/constants/Exercises';
import { useAuthStore } from '@/stores/authStore';
import { createRoutine, updateRoutine } from '@/lib/firestore';
import type { RoutineExercise } from '@/types';

export default function RoutineCreateScreen() {
  const params = useLocalSearchParams<{
    routineId?: string;
    routineName?: string;
    exercises?: string;
  }>();

  const { user } = useAuthStore();
  const isEditing = !!params.routineId;
  const [isSaving, setIsSaving] = useState(false);

  const [routineName, setRoutineName] = useState(params.routineName || '');
  const [selectedExercises, setSelectedExercises] = useState<string[]>(() => {
    if (params.exercises) {
      try {
        const parsed = JSON.parse(params.exercises) as RoutineExercise[];
        return parsed.map((e) => e.name);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const toggleExercise = (exercise: string) => {
    setSelectedExercises((prev) =>
      prev.includes(exercise)
        ? prev.filter((e) => e !== exercise)
        : [...prev, exercise]
    );
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const newList = [...selectedExercises];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    setSelectedExercises(newList);
  };

  const filteredExercises = searchQuery.trim()
    ? ALL_EXERCISES.filter((e) => e.toLowerCase().includes(searchQuery.toLowerCase()))
    : activeCategory
    ? EXERCISE_DATABASE.find((c) => c.category === activeCategory)?.exercises || []
    : [];

  const handleSave = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert('운동을 추가해주세요', '최소 1개의 운동을 선택해주세요.');
      return;
    }
    if (!routineName.trim()) {
      Alert.alert('루틴 이름을 입력해주세요');
      return;
    }
    if (!user?.uid) return;

    setIsSaving(true);
    try {
      const exercises: RoutineExercise[] = selectedExercises.map((name, idx) => ({
        order: idx,
        name,
      }));

      if (isEditing && params.routineId) {
        await updateRoutine(params.routineId, {
          name: routineName.trim(),
          exercises,
        });
      } else {
        await createRoutine(user.uid, routineName.trim(), exercises);
      }
      router.back();
    } catch (error) {
      Alert.alert('오류', '루틴 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? '루틴 편집' : '새 루틴 만들기'}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>저장</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.nameInput}
          placeholder="루틴 이름 (예: 하체 데이)"
          placeholderTextColor={Colors.textMuted}
          value={routineName}
          onChangeText={setRoutineName}
          maxLength={30}
        />

        {selectedExercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>선택한 운동 ({selectedExercises.length})</Text>
            {selectedExercises.map((exercise, index) => (
              <View key={exercise} style={styles.selectedItem}>
                <Text style={styles.selectedIndex}>{index + 1}</Text>
                <Text style={styles.selectedName}>{exercise}</Text>
                <View style={styles.reorderButtons}>
                  {index > 0 && (
                    <TouchableOpacity onPress={() => moveExercise(index, 'up')} style={styles.reorderBtn}>
                      <Text style={styles.reorderText}>↑</Text>
                    </TouchableOpacity>
                  )}
                  {index < selectedExercises.length - 1 && (
                    <TouchableOpacity onPress={() => moveExercise(index, 'down')} style={styles.reorderBtn}>
                      <Text style={styles.reorderText}>↓</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={() => toggleExercise(exercise)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TextInput
          style={styles.searchInput}
          placeholder="🔍 운동 검색"
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (text.trim()) setActiveCategory(null);
          }}
        />

        {!searchQuery.trim() && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
            {EXERCISE_DATABASE.map((cat) => (
              <TouchableOpacity
                key={cat.category}
                style={[styles.categoryTab, activeCategory === cat.category && styles.categoryTabActive]}
                onPress={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
              >
                <Text style={[styles.categoryTabText, activeCategory === cat.category && styles.categoryTabTextActive]}>
                  {cat.category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {filteredExercises.length > 0 && (
          <View style={styles.exerciseGrid}>
            {filteredExercises.map((exercise) => (
              <TouchableOpacity
                key={exercise}
                style={[styles.exerciseChip, selectedExercises.includes(exercise) && styles.exerciseChipSelected]}
                onPress={() => toggleExercise(exercise)}
              >
                <Text style={[styles.exerciseChipText, selectedExercises.includes(exercise) && styles.exerciseChipTextSelected]}>
                  {selectedExercises.includes(exercise) ? '✓ ' : '+ '}{exercise}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {searchQuery.trim() && filteredExercises.length === 0 && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>검색 결과가 없습니다</Text>
            <TouchableOpacity
              style={styles.addCustomButton}
              onPress={() => {
                toggleExercise(searchQuery.trim());
                setSearchQuery('');
              }}
            >
              <Text style={styles.addCustomText}>"{searchQuery.trim()}" 직접 추가하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { fontSize: 15, color: Colors.textSecondary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  saveButton: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  nameInput: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12 },
  selectedItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundSecondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 6, borderWidth: 1, borderColor: Colors.primary + '30' },
  selectedIndex: { fontSize: 14, fontWeight: '700', color: Colors.primary, width: 24 },
  selectedName: { flex: 1, fontSize: 15, color: Colors.text },
  reorderButtons: { flexDirection: 'row', gap: 4, marginRight: 8 },
  reorderBtn: { padding: 4 },
  reorderText: { fontSize: 16, color: Colors.textSecondary },
  removeButton: { fontSize: 14, color: Colors.textMuted, padding: 4 },
  searchInput: { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  categoryScroll: { marginBottom: 16 },
  categoryContent: { gap: 8 },
  categoryTab: { backgroundColor: Colors.backgroundSecondary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  categoryTabActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  categoryTabText: { fontSize: 14, color: Colors.textSecondary },
  categoryTabTextActive: { color: Colors.primary, fontWeight: '600' },
  exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exerciseChip: { backgroundColor: Colors.backgroundSecondary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  exerciseChipSelected: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  exerciseChipText: { fontSize: 13, color: Colors.textSecondary },
  exerciseChipTextSelected: { color: Colors.primary, fontWeight: '600' },
  noResults: { alignItems: 'center', paddingVertical: 20 },
  noResultsText: { fontSize: 14, color: Colors.textMuted, marginBottom: 12 },
  addCustomButton: { backgroundColor: Colors.primary + '20', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addCustomText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
});
