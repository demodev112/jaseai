import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';

/**
 * Root Index
 *
 * This screen is a simple loading placeholder.
 * All auth-based routing is handled by _layout.tsx via onAuthStateChanged.
 */
export default function Index() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
