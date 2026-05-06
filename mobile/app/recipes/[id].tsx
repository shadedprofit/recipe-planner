import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ChefHat, Clock3, ListChecks, Users } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Recipe, RecipeIngredient } from 'recipe-planner-shared';
import { ApiError, getRecipe } from '../../src/api/client';
import { useResponsiveLayout } from '../../src/hooks/useResponsiveLayout';
import { useRecipeStore } from '../../src/store/recipeStore';
import { tokens } from '../../src/theme/tokens';

function formatIngredient(ingredient: RecipeIngredient): string {
  const quantity = ingredient.quantity.trim();
  const unit = ingredient.unit.trim();
  const measure = [quantity, unit].filter(Boolean).join(' ');
  return measure ? `${measure} ${ingredient.name}` : ingredient.name;
}

type FetchStatus = 'idle' | 'loading' | 'not-found' | 'error';

export default function RecipeDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const layout = useResponsiveLayout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipes = useRecipeStore((state) => state.recipes);

  const recipeFromStore = useMemo<Recipe | undefined>(
    () => recipes.find((entry) => entry.id === id),
    [recipes, id],
  );

  const [fetchedRecipe, setFetchedRecipe] = useState<Recipe | null>(null);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id || recipeFromStore) return;
    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);
    setFetchedRecipe(null);
    getRecipe(id)
      .then((recipe) => {
        if (cancelled) return;
        setFetchedRecipe(recipe);
        setStatus('idle');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setStatus('not-found');
          return;
        }
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Could not load recipe.');
      });
    return () => {
      cancelled = true;
    };
  }, [id, recipeFromStore]);

  const recipe = recipeFromStore ?? (fetchedRecipe?.id === id ? fetchedRecipe : null);

  const containerStyle = [
    styles.container,
    { paddingTop: insets.top + tokens.spacing.md, paddingBottom: insets.bottom },
  ];

  if (!recipe) {
    if (status === 'loading') {
      return (
        <View style={containerStyle}>
          <View style={styles.emptyShell}>
            <View style={styles.emptyState} accessibilityRole="alert">
              <ActivityIndicator size="large" color={tokens.colors.primary} />
              <Text style={styles.emptyText}>Loading recipe...</Text>
            </View>
          </View>
        </View>
      );
    }

    const title = status === 'error' ? 'Could not load recipe' : 'Recipe unavailable';
    const message =
      status === 'error'
        ? (errorMessage ?? 'Something went wrong loading this recipe.')
        : 'This recipe is no longer available. Generate a new batch to see details.';

    return (
      <View style={containerStyle}>
        <View style={styles.emptyShell}>
          <View style={styles.emptyState} accessibilityRole="alert">
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptyText}>{message}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back to recipes"
          >
            <ArrowLeft size={19} color={tokens.colors.surface} />
            <Text style={styles.primaryButtonText}>Back to Recipes</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.shell, layout.isWide && styles.shellWide]}>
          <View style={[styles.heroPanel, layout.isWide && styles.heroPanelWide]}>
            <View style={styles.heroIcon}>
              <ChefHat size={26} color={tokens.colors.primaryStrong} />
            </View>
            <Text style={styles.title}>{recipe.title}</Text>
            {recipe.description.length > 0 && (
              <Text style={styles.description}>{recipe.description}</Text>
            )}

            <View style={styles.metaRow} accessibilityLabel="Recipe summary">
              <View style={styles.metaItem}>
                <Clock3 size={20} color={tokens.colors.primaryStrong} />
                <Text style={styles.metaLabel}>Time</Text>
                <Text style={styles.metaValue}>{recipe.totalTimeMinutes} min</Text>
              </View>
              <View style={styles.metaItem}>
                <Users size={20} color={tokens.colors.primaryStrong} />
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
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.sectionPanel}>
              <View style={styles.sectionHeader}>
                <ChefHat size={19} color={tokens.colors.primaryStrong} />
                <Text style={styles.sectionTitle}>Ingredients</Text>
              </View>
              {recipe.ingredients.map((ingredient, index) => (
                <View
                  key={`${ingredient.name}-${index}`}
                  style={[styles.ingredientRow, index === 0 && styles.rowFirst]}
                >
                  <View style={styles.bullet} />
                  <Text style={styles.ingredientText}>{formatIngredient(ingredient)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionPanel}>
              <View style={styles.sectionHeader}>
                <ListChecks size={19} color={tokens.colors.primaryStrong} />
                <Text style={styles.sectionTitle}>Steps</Text>
              </View>
              {recipe.steps.map((step, index) => (
                <View
                  key={`step-${index}`}
                  style={[styles.stepRow, index === 0 && styles.rowFirst]}
                >
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
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
  shell: {
    width: '100%',
    maxWidth: tokens.layout.maxContentWidth,
    alignSelf: 'center',
    gap: tokens.spacing.md,
  },
  shellWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.lg,
  },
  heroPanel: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    padding: tokens.spacing.lg,
    ...tokens.shadow.card,
  },
  heroPanelWide: {
    width: tokens.layout.sideRailWidth,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: '800',
    color: tokens.colors.text,
    lineHeight: tokens.fontSize.xxl * tokens.lineHeight.tight,
    marginTop: tokens.spacing.xs,
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
    backgroundColor: tokens.colors.surfaceWarm,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    padding: tokens.spacing.md,
  },
  metaLabel: {
    color: tokens.colors.textMuted,
    fontSize: tokens.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginTop: tokens.spacing.sm,
  },
  metaValue: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.lg,
    fontWeight: '800',
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
    backgroundColor: tokens.colors.accentMuted,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  tagText: {
    color: tokens.colors.accent,
    fontSize: tokens.fontSize.xs,
    fontWeight: '800',
  },
  detailGrid: {
    flex: 1,
    gap: tokens.spacing.md,
  },
  sectionPanel: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    padding: tokens.spacing.lg,
    ...tokens.shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  sectionTitle: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.lg,
    fontWeight: '800',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
  },
  rowFirst: {
    marginTop: 0,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.primary,
    marginTop: 8,
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
    marginTop: tokens.spacing.md,
  },
  stepNumber: {
    color: tokens.colors.primaryStrong,
    backgroundColor: tokens.colors.primaryMuted,
    borderRadius: tokens.radius.full,
    fontSize: tokens.fontSize.sm,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    width: 28,
    height: 28,
    lineHeight: 28,
    textAlign: 'center',
  },
  stepText: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.md,
    lineHeight: tokens.fontSize.md * tokens.lineHeight.normal,
    flex: 1,
  },
  emptyShell: {
    flex: 1,
    width: '100%',
    maxWidth: tokens.layout.maxReadableWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    padding: tokens.spacing.xl,
    ...tokens.shadow.card,
  },
  emptyTitle: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.lg,
    fontWeight: '800',
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
    minHeight: 56,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  primaryButtonText: {
    color: tokens.colors.surface,
    fontSize: tokens.fontSize.md,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
});
