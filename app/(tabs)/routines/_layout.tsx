import { Stack } from 'expo-router';
import Colors from '@/constants/Colors';

export default function RoutinesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create" options={{ presentation: 'modal' }} />
      <Stack.Screen name="session" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
