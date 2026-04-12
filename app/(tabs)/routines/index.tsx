import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import { getRoutines, deleteRoutine } from '@/lib/firestore';
import type { Routine } from '@/types';

export default function RoutinesListScreen() {
  const { user } = useAuthStore();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const fetchRoutines = useCallback(async () => {
    if (!user?.uid) return;
    setFetchError(false);
    try {
      const data = await getRoutines(user.uid);
      setRoutines(data);
    } catch (error) {
      console.error('Failed to fetch routines:', error);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRoutines();
    setIsRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [fetchRoutines])
  );

  const handleCreateRoutine = () => {
    router.push('/(tabs)/routines/create');
  };

  const handleStartSession = (routine: Routine) => {
    router.push({
      pathname: '/(tabs)/routines/session',
      params: {
        routineId: routine.routineId,
        routineName: routine.name,
        exercises: JSON.stringify(routine.exercises),
      },
    });
  };

  const handleEditRoutine = (routine: Routine) => {
    router.push({
      pathname: '/(tabs)/routines/create',
      params: {
        routineId: routine.routineId,
        routineName: routine.name,
        exercises: JSON.stringify(routine.exercises),
      },
    });
  };

  const handleDeleteRoutine = (routine: Routine) => {
    Alert.alert('루틴 삭제', `"${routine.name}" 루틴을 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            if (user?.uid) {
              await deleteRoutine(user.uid, routine.routineId);
              setRoutines((prev) => prev.filter((r) => r.routineId !== routine.routineId));
            }
          } catch (error) {
            Alert.alert('오류', '루틴 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const renderRoutineCard = ({ item }: { item: Routine }) => (
    <View style={styles.routineCard}>
      <View style={styles.routineHeader}>
        <Text style={styles.routineName}>{item.name}</Text>
        <View style={styles.routineActions}>
          <TouchableOpacity onPress={() => handleEditRoutine(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.editButton}>편집</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteRoutine(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.deleteButton}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.exerciseList}>
        {item.exercises.map((ex, idx) => (
          <Text key={idx} style={styles.exerciseItem}>{idx + 1}. {ex.name}</Text>
        ))}
      </View>
      <Text style={styles.exerciseCount}>{item.exerciseCount}개 운동</Text>
      <TouchableOpacity style={styles.startButton} onPress={() => handleStartSession(item)} activeOpacity={0.8}>
        <Text style={styles.startButtonText}>루틴 시작 ▶</Text>
      </TouchableOpacity>
    </View>
  );

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
          <Text style={styles.emptyTitle}>루틴을 불러올 수 없어요</Text>
          <Text style={styles.emptySubtitle}>네트워크를 확인하고 다시 시도해주세요.</Text>
          <TouchableOpacity style={styles.emptyCreateButton} onPress={fetchRoutines}>
            <Text style={styles.emptyCreateText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={styles.emptyTitle}>루틴이 없어요</Text>
        <Text style={styles.emptySubtitle}>나만의 운동 루틴을 만들어보세요!</Text>
        <TouchableOpacity style={styles.emptyCreateButton} onPress={handleCreateRoutine}>
          <Text style={styles.emptyCreateText}>+ 루틴 만들기</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>루틴</Text>
        {routines.length > 0 && (
          <TouchableOpacity onPress={handleCreateRoutine}>
            <Text style={styles.addButton}>+ 새 루틴</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={routines}
        keyExtractor={(item) => item.routineId}
        renderItem={renderRoutineCard}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.text },
  addButton: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  listContent: { paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 },
  routineCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  routineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  routineName: { fontSize: 18, fontWeight: '700', color: Colors.text, flex: 1 },
  routineActions: { flexDirection: 'row', gap: 16 },
  editButton: { fontSize: 13, color: Colors.primary },
  deleteButton: { fontSize: 13, color: Colors.danger },
  exerciseList: { marginBottom: 8 },
  exerciseItem: { fontSize: 14, color: Colors.textSecondary, lineHeight: 24 },
  exerciseCount: { fontSize: 13, color: Colors.textTertiary, marginBottom: 16 },
  startButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  startButtonText: { fontSize: 16, fontWeight: '700', color: Colors.textOnPrimary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: Colors.textTertiary, marginBottom: 24 },
  emptyCreateButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  emptyCreateText: { fontSize: 16, fontWeight: '700', color: Colors.textOnPrimary },
});
