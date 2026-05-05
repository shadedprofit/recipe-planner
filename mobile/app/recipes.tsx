import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Recipe } from 'recipe-planner-shared';
import { extractIngredients, generateRecipes } from '../src/api/client';
import { useRecipeStore } from '../src/store/recipeStore';
import { tokens } from '../src/theme/tokens';

type GenerationPhase = 'idle' | 'analyzing' | 'generating';

interface GeneratedRecipesResult {
  recipes: Recipe[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Could not generate recipes. Please try again.';
}

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const hasStartedInitialGeneration = useRef(false);
  const [phase, setPhase] = useState<GenerationPhase>('idle');

  const selectedImages = useRecipeStore((state) => state.selectedImages);
  const detectedIngredients = useRecipeStore((state) => state.detectedIngredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const seenRecipeIds = useRecipeStore((state) => state.seenRecipeIds);
  const setDetectedIngredients = useRecipeStore((state) => state.setDetectedIngredients);
  const setRecipes = useRecipeStore((state) => state.setRecipes);
  const addSeenRecipeIds = useRecipeStore((state) => state.addSeenRecipeIds);
  const clearHistory = useRecipeStore((state) => state.clearHistory);

  const generation = useMutation<GeneratedRecipesResult, Error>({
    mutationFn: async () => {
      if (selectedImages.length === 0) {
        throw new Error('Add ingredient photos before generating recipes.');
      }

      setPhase('analyzing');
      const extracted = await extractIngredients({
        images: selectedImages.map((image) => image.base64),
      });
      setDetectedIngredients(extracted.ingredients);

      const ingredientNames = extracted.ingredients.map((ingredient) => ingredient.name);
      if (ingredientNames.length === 0) {
        throw new Error('No ingredients were found. Try a clearer photo.');
      }

      setPhase('generating');
      const generated = await generateRecipes({
        ingredients: ingredientNames,
        excludeRecipeIds: seenRecipeIds,
      });

      return { recipes: generated.recipes };
    },
    onSuccess: ({ recipes: nextRecipes }) => {
      setRecipes(nextRecipes);
      addSeenRecipeIds(nextRecipes.map((recipe) => recipe.id));
    },
    onSettled: () => setPhase('idle'),
  });

  useEffect(() => {
    if (hasStartedInitialGeneration.current || selectedImages.length === 0 || recipes.length > 0) {
      return;
    }

    hasStartedInitialGeneration.current = true;
    generation.mutate();
  }, [generation, recipes.length, selectedImages.length]);

  const isBusy = generation.isPending;
  const statusText =
    phase === 'analyzing'
      ? 'Analyzing photos...'
      : phase === 'generating'
        ? 'Generating recipes...'
        : null;

  const handleRefresh = () => {
    generation.mutate();
  };

  const handleClearHistory = () => {
    Alert.alert('Clear recipe history?', 'Previously seen recipe IDs will be eligible again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: clearHistory,
      },
    ]);
  };

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <Pressable
      style={({ pressed }) => [styles.recipeCard, pressed && styles.pressed]}
      onPress={() => router.push({ pathname: '/recipes/[id]', params: { id: item.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
    >
      <Text style={styles.recipeTitle}>{item.title}</Text>
      <Text style={styles.recipeDescription}>{item.description}</Text>
      <View style={styles.recipeMeta}>
        <Text style={styles.recipeMetaText}>{item.totalTimeMinutes} min</Text>
        <Text style={styles.recipeMetaText}>{item.servings} servings</Text>
      </View>
      {item.tags.length > 0 && (
        <Text style={styles.recipeTags} numberOfLines={1}>
          {item.tags.join(' / ')}
        </Text>
      )}
    </Pressable>
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + tokens.spacing.md, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Recipes</Text>
          <Text style={styles.subtitle}>
            {detectedIngredients.length > 0
              ? `${detectedIngredients.length} ingredients found`
              : `${selectedImages.length} photo${selectedImages.length === 1 ? '' : 's'} ready`}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={handleClearHistory}
          accessibilityRole="button"
          accessibilityLabel="Clear seen recipe history"
        >
          <Text style={styles.secondaryButtonText}>Clear</Text>
        </Pressable>
      </View>

      {isBusy && (
        <View style={styles.statusPanel} accessibilityRole="alert">
          <ActivityIndicator color={tokens.colors.primary} />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      )}

      {generation.error && !isBusy && (
        <View style={styles.errorPanel} accessibilityRole="alert">
          <Text style={styles.errorText}>{getErrorMessage(generation.error)}</Text>
        </View>
      )}

      {selectedImages.length === 0 && recipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No photos selected</Text>
          <Text style={styles.emptyText}>Go back and add ingredient photos first.</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={renderRecipe}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !isBusy ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No recipes yet</Text>
                <Text style={styles.emptyText}>Generate recipes from your selected photos.</Text>
              </View>
            ) : null
          }
        />
      )}

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          (pressed || isBusy || selectedImages.length === 0) && styles.primaryButtonMuted,
        ]}
        onPress={handleRefresh}
        disabled={isBusy || selectedImages.length === 0}
        accessibilityRole="button"
        accessibilityLabel={recipes.length > 0 ? 'Refresh recipes' : 'Generate recipes'}
      >
        <Text style={styles.primaryButtonText}>
          {recipes.length > 0 ? 'Refresh Recipes' : 'Generate Recipes'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    paddingHorizontal: tokens.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.fontSize.xl,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.sm,
    marginTop: tokens.spacing.xs,
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.surface,
  },
  secondaryButtonText: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.sm,
    fontWeight: '600',
  },
  statusPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  statusText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.md,
  },
  errorPanel: {
    borderColor: tokens.colors.error,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    backgroundColor: '#FEF2F2',
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  errorText: {
    color: tokens.colors.error,
    fontSize: tokens.fontSize.sm,
    lineHeight: tokens.fontSize.sm * tokens.lineHeight.normal,
  },
  listContent: {
    gap: tokens.spacing.sm,
    paddingBottom: tokens.spacing.md,
  },
  recipeCard: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    padding: tokens.spacing.md,
  },
  recipeTitle: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.lg,
    fontWeight: '700',
  },
  recipeDescription: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.sm,
    lineHeight: tokens.fontSize.sm * tokens.lineHeight.normal,
    marginTop: tokens.spacing.xs,
  },
  recipeMeta: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.sm,
  },
  recipeMetaText: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.sm,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  recipeTags: {
    color: tokens.colors.textMuted,
    fontSize: tokens.fontSize.xs,
    marginTop: tokens.spacing.sm,
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
  primaryButtonMuted: {
    opacity: 0.45,
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
