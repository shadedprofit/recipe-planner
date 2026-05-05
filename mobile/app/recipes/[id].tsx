import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Recipe, RecipeIngredient } from 'recipe-planner-shared';
import { useRecipeStore } from '../../src/store/recipeStore';
import { tokens } from '../../src/theme/tokens';

function formatIngredient(ingredient: RecipeIngredient): string {
  const quantity = ingredient.quantity.trim();
  const unit = ingredient.unit.trim();
  const measure = [quantity, unit].filter(Boolean).join(' ');
  return measure ? `${measure} ${ingredient.name}` : ingredient.name;
}

export default function RecipeDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipes = useRecipeStore((state) => state.recipes);

  const recipe = useMemo<Recipe | undefined>(
    () => recipes.find((entry) => entry.id === id),
    [recipes, id],
  );

  if (!recipe) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + tokens.spacing.md, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.emptyState} accessibilityRole="alert">
          <Text style={styles.emptyTitle}>Recipe unavailable</Text>
          <Text style={styles.emptyText}>
            This recipe is no longer in your current session. Generate a new batch to see details.
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back to recipes"
        >
          <Text style={styles.primaryButtonText}>Back to Recipes</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + tokens.spacing.md, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{recipe.title}</Text>
        {recipe.description.length > 0 && (
          <Text style={styles.description}>{recipe.description}</Text>
        )}

        <View style={styles.metaRow} accessibilityLabel="Recipe summary">
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Time</Text>
            <Text style={styles.metaValue}>{recipe.totalTimeMinutes} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Servings</Text>
            <Text style={styles.metaValue}>{recipe.servings}</Text>
          </View>
        </View>

        {recipe.tags.length > 0 && (
          <View style={styles.tagRow}>
            {recipe.tags.map((tag, index) => (
              <View key={`${tag}-${index}`} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Ingredients</Text>
        <View style={styles.section}>
          {recipe.ingredients.map((ingredient, index) => (
            <View
              key={`${ingredient.name}-${index}`}
              style={[styles.ingredientRow, index === 0 && styles.ingredientRowFirst]}
            >
              <Text style={styles.bullet}>-</Text>
              <Text style={styles.ingredientText}>{formatIngredient(ingredient)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Steps</Text>
        <View style={styles.section}>
          {recipe.steps.map((step, index) => (
            <View key={`step-${index}`} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{index + 1}.</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    paddingHorizontal: tokens.spacing.md,
  },
  scrollContent: {
    paddingBottom: tokens.spacing.xl,
  },
  title: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  description: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.md,
    lineHeight: tokens.fontSize.md * tokens.lineHeight.normal,
    marginTop: tokens.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.lg,
  },
  metaItem: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    padding: tokens.spacing.md,
  },
  metaLabel: {
    color: tokens.colors.textMuted,
    fontSize: tokens.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: tokens.spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.md,
  },
  tag: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  tagText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.xs,
  },
  sectionTitle: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.lg,
    fontWeight: '700',
    marginTop: tokens.spacing.lg,
    marginBottom: tokens.spacing.sm,
  },
  section: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    padding: tokens.spacing.md,
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
  },
  ingredientRowFirst: {
    marginTop: 0,
  },
  bullet: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.md,
    lineHeight: tokens.fontSize.md * tokens.lineHeight.normal,
  },
  ingredientText: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.md,
    lineHeight: tokens.fontSize.md * tokens.lineHeight.normal,
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  stepNumber: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.md,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    minWidth: 24,
  },
  stepText: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.md,
    lineHeight: tokens.fontSize.md * tokens.lineHeight.normal,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
  },
  emptyTitle: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.md,
    lineHeight: tokens.fontSize.md * tokens.lineHeight.normal,
    marginTop: tokens.spacing.xs,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 52,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.md,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: tokens.fontSize.md,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
