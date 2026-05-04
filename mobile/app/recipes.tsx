import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '../src/theme/tokens';

export default function RecipesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Recipes</Text>
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
