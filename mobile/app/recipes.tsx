import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Users,
} from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Recipe } from 'recipe-planner-shared';
import { extractIngredients, generateRecipes } from '../src/api/client';
import { useResponsiveLayout } from '../src/hooks/useResponsiveLayout';
import { useRecipeStore } from '../src/store/recipeStore';
import { tokens } from '../src/theme/tokens';

type GenerationPhase = 'idle' | 'analyzing' | 'generating';

interface GeneratedRecipesResult {
  recipes: Recipe[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('returned malformed data')) {
      return 'The recipe model returned an incomplete response. Please try again.';
    }
    if (error.message.includes('Photo data is no longer available')) {
      return 'Photo data is no longer available. Start over and add photos again.';
    }
    if (error.message.includes('high demand') || error.message.includes('UNAVAILABLE')) {
      return 'The AI model is temporarily busy. Please try again in a minute.';
    }
    if (
      error.message.includes('quota') ||
      error.message.includes('RESOURCE_EXHAUSTED') ||
      error.message.includes('429')
    ) {
      return 'The demo has used up its Gemini API quota for now. Please try again after the quota resets.';
    }
    return error.message;
  }
  return 'Could not generate recipes. Please try again.';
}

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const layout = useResponsiveLayout();
  const hasStartedInitialGeneration = useRef(false);
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [isClearConfirmVisible, setIsClearConfirmVisible] = useState(false);

  const selectedImages = useRecipeStore((state) => state.selectedImages);
  const detectedIngredients = useRecipeStore((state) => state.detectedIngredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const seenRecipeIds = useRecipeStore((state) => state.seenRecipeIds);
  const setDetectedIngredients = useRecipeStore((state) => state.setDetectedIngredients);
  const setRecipes = useRecipeStore((state) => state.setRecipes);
  const addSeenRecipeIds = useRecipeStore((state) => state.addSeenRecipeIds);
  const clearHistory = useRecipeStore((state) => state.clearHistory);
  const clearSession = useRecipeStore((state) => state.clearSession);

  const generation = useMutation<GeneratedRecipesResult, Error>({
    mutationFn: async () => {
      if (selectedImages.length === 0) {
        throw new Error('Add ingredient photos before generating recipes.');
      }

      let ingredients = detectedIngredients;
      if (ingredients.length === 0) {
        const imagePayloads = selectedImages.map((image) => image.base64).filter(Boolean);
        if (imagePayloads.length !== selectedImages.length) {
          throw new Error('Photo data is no longer available');
        }

        setPhase('analyzing');
        const extracted = await extractIngredients({
          images: imagePayloads,
        });
        ingredients = extracted.ingredients;
        setDetectedIngredients(ingredients);
      }

      const ingredientNames = ingredients.map((ingredient) => ingredient.name);
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
  const listColumns = layout.isDesktop ? 2 : 1;
  const statusText =
    phase === 'analyzing'
      ? 'Analyzing photos...'
      : phase === 'generating'
        ? 'Generating recipes...'
        : null;

  const handleRefresh = () => {
    generation.mutate();
  };

  const resetDemo = () => {
    clearHistory();
    clearSession();
    router.replace('/');
  };

  const goToCapture = () => {
    router.replace('/');
  };

  const handleClear = () => {
    if (Platform.OS === 'web') {
      setIsClearConfirmVisible(true);
      return;
    }

    Alert.alert('Start over?', 'This also resets seen recipe history for refreshes.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start over',
        style: 'destructive',
        onPress: resetDemo,
      },
    ]);
  };

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <Pressable
      style={({ pressed }) => [
        styles.recipeCard,
        layout.isDesktop && styles.recipeCardWide,
        pressed && styles.pressed,
      ]}
      onPress={() => router.push({ pathname: '/recipes/[id]', params: { id: item.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.recipeBadge}>
          <Sparkles size={16} color={tokens.colors.primaryStrong} />
        </View>
        <ChevronRight size={20} color={tokens.colors.textMuted} />
      </View>
      <Text style={styles.recipeTitle}>{item.title}</Text>
      <Text style={styles.recipeDescription}>{item.description}</Text>
      <View style={styles.recipeMeta}>
        <View style={styles.metaChip}>
          <Clock3 size={15} color={tokens.colors.primaryStrong} />
          <Text style={styles.recipeMetaText}>{item.totalTimeMinutes} min</Text>
        </View>
        <View style={styles.metaChip}>
          <Users size={15} color={tokens.colors.primaryStrong} />
          <Text style={styles.recipeMetaText}>{item.servings} servings</Text>
        </View>
      </View>
      {item.tags.length > 0 && (
        <View style={styles.tagRow}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={`${tag}-${index}`} style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );

  const contextRail = (
    <View style={[styles.contextRail, layout.isWide && styles.contextRailWide]}>
      <Text style={styles.railLabel}>Your ingredients</Text>
      <Text style={styles.railTitle}>
        {detectedIngredients.length > 0
          ? `${detectedIngredients.length} found`
          : `${selectedImages.length} photo${selectedImages.length === 1 ? '' : 's'} ready`}
      </Text>

      {selectedImages.length > 0 && (
        <View style={styles.photoStrip}>
          {selectedImages.slice(0, 6).map((image, index) => (
            <Image
              key={`${image.uri}-${index}`}
              source={{ uri: image.uri }}
              style={styles.railThumb}
              accessibilityIgnoresInvertColors
            />
          ))}
        </View>
      )}

      {detectedIngredients.length > 0 && (
        <View style={styles.ingredientList}>
          {detectedIngredients.slice(0, 8).map((ingredient) => (
            <View key={ingredient.name} style={styles.ingredientPill}>
              <Text style={styles.ingredientText}>{ingredient.name}</Text>
            </View>
          ))}
        </View>
      )}

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
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              style={({ pressed }) => [styles.headerBackButton, pressed && styles.pressed]}
              onPress={goToCapture}
              accessibilityRole="button"
              accessibilityLabel="Back to ingredient photos"
            >
              <ArrowLeft size={20} color={tokens.colors.text} strokeWidth={2.5} />
              <Text style={styles.headerBackText}>Photos</Text>
            </Pressable>
          ),
        }}
      />
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + tokens.spacing.md, paddingBottom: insets.bottom },
        ]}
      >
        <View style={[styles.shell, layout.isWide && styles.shellWide]}>
          {layout.isWide && contextRail}

          <View style={styles.mainPane}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.eyebrow}>Fresh batch</Text>
                <Text style={styles.title}>Recipes</Text>
                {!layout.isWide && (
                  <Text style={styles.subtitle}>
                    {detectedIngredients.length > 0
                      ? `${detectedIngredients.length} ingredients found`
                      : `${selectedImages.length} photo${selectedImages.length === 1 ? '' : 's'} ready`}
                  </Text>
                )}
              </View>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                onPress={handleClear}
                accessibilityRole="button"
                accessibilityLabel="Start over with new photos and reset seen recipe history"
              >
                <RotateCcw size={16} color={tokens.colors.text} />
                <Text style={styles.secondaryButtonText}>Start over</Text>
              </Pressable>
            </View>

            {!layout.isWide && contextRail}

            {selectedImages.length === 0 && recipes.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No photos selected</Text>
                <Text style={styles.emptyText}>Go back and add ingredient photos first.</Text>
              </View>
            ) : (
              <FlatList
                key={listColumns}
                data={recipes}
                keyExtractor={(item) => item.id}
                renderItem={renderRecipe}
                numColumns={listColumns}
                columnWrapperStyle={layout.isDesktop ? styles.recipeGridRow : undefined}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  !isBusy ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyTitle}>No recipes yet</Text>
                      <Text style={styles.emptyText}>
                        Generate recipes from your selected photos.
                      </Text>
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
              <RefreshCw size={19} color={tokens.colors.surface} />
              <Text style={styles.primaryButtonText}>
                {recipes.length > 0 ? 'Refresh Recipes' : 'Generate Recipes'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
      <Modal
        visible={isClearConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsClearConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>Start over?</Text>
            <Text style={styles.confirmText}>
              This also resets seen recipe history for refreshes.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
                onPress={() => setIsClearConfirmVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel start over"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.destructiveButton, pressed && styles.pressed]}
                onPress={resetDemo}
                accessibilityRole="button"
                accessibilityLabel="Confirm start over"
              >
                <Text style={styles.destructiveButtonText}>Start over</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    paddingHorizontal: tokens.spacing.md,
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: tokens.layout.maxContentWidth,
    alignSelf: 'center',
  },
  shellWide: {
    flexDirection: 'row',
    gap: tokens.spacing.lg,
  },
  headerBackButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
  },
  headerBackText: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.sm,
    fontWeight: '800',
  },
  contextRail: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    ...tokens.shadow.card,
  },
  contextRailWide: {
    width: tokens.layout.sideRailWidth,
    marginBottom: 0,
  },
  railLabel: {
    color: tokens.colors.primaryStrong,
    fontSize: tokens.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  railTitle: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.xl,
    fontWeight: '800',
    marginTop: tokens.spacing.xs,
  },
  photoStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  railThumb: {
    width: 58,
    height: 58,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.skeleton,
  },
  ingredientList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.md,
  },
  ingredientPill: {
    backgroundColor: tokens.colors.primaryMuted,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  ingredientText: {
    color: tokens.colors.primaryStrong,
    fontSize: tokens.fontSize.xs,
    fontWeight: '800',
  },
  mainPane: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: tokens.colors.accent,
    fontSize: tokens.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: '800',
    color: tokens.colors.text,
    lineHeight: tokens.fontSize.xxl * tokens.lineHeight.tight,
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.sm,
    marginTop: tokens.spacing.xs,
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.surface,
    flexDirection: 'row',
    gap: tokens.spacing.xs,
  },
  secondaryButtonText: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.sm,
    fontWeight: '800',
  },
  statusPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.primaryMuted,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    marginTop: tokens.spacing.md,
  },
  statusText: {
    color: tokens.colors.primaryStrong,
    fontSize: tokens.fontSize.sm,
    fontWeight: '700',
  },
  errorPanel: {
    borderColor: tokens.colors.error,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    backgroundColor: tokens.colors.errorMuted,
    padding: tokens.spacing.md,
    marginTop: tokens.spacing.md,
  },
  errorText: {
    color: tokens.colors.error,
    fontSize: tokens.fontSize.sm,
    lineHeight: tokens.fontSize.sm * tokens.lineHeight.normal,
  },
  listContent: {
    gap: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
  },
  recipeGridRow: {
    gap: tokens.spacing.md,
  },
  recipeCard: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    padding: tokens.spacing.lg,
    ...tokens.shadow.card,
  },
  recipeCardWide: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  recipeBadge: {
    width: 34,
    height: 34,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeTitle: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.lg,
    fontWeight: '800',
    lineHeight: tokens.fontSize.lg * tokens.lineHeight.tight,
  },
  recipeDescription: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.sm,
    lineHeight: tokens.fontSize.sm * tokens.lineHeight.normal,
    marginTop: tokens.spacing.sm,
  },
  recipeMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: tokens.colors.surfaceMuted,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  recipeMetaText: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.sm,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
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
  emptyState: {
    flex: 1,
    minHeight: 260,
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
    marginBottom: tokens.spacing.md,
    ...tokens.shadow.floating,
  },
  primaryButtonMuted: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: tokens.colors.surface,
    fontSize: tokens.fontSize.md,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,26,22,0.38)',
    padding: tokens.spacing.md,
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: tokens.spacing.lg,
    ...tokens.shadow.floating,
  },
  confirmTitle: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.lg,
    fontWeight: '800',
  },
  confirmText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.md,
    lineHeight: tokens.fontSize.md * tokens.lineHeight.normal,
    marginTop: tokens.spacing.sm,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.lg,
  },
  cancelButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.spacing.md,
    backgroundColor: tokens.colors.surface,
  },
  cancelButtonText: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.sm,
    fontWeight: '800',
  },
  destructiveButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.spacing.md,
    backgroundColor: tokens.colors.error,
  },
  destructiveButtonText: {
    color: tokens.colors.surface,
    fontSize: tokens.fontSize.sm,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
});
