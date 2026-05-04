import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '../src/theme/tokens';

export default function CaptureScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Recipe Planner</Text>
      <Text style={styles.subtitle}>Take photos of your ingredients</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: tokens.fontSize.xl,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: tokens.fontSize.md,
    color: tokens.colors.textSecondary,
    marginTop: tokens.spacing.sm,
  },
});
