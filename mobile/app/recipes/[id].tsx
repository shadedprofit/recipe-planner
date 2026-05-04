import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { tokens } from '../../src/theme/tokens';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Recipe {id}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    padding: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.fontSize.xl,
    fontWeight: '700',
    color: tokens.colors.text,
  },
});
