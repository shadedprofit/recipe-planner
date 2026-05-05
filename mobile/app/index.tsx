import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { tokens } from '../src/theme/tokens';
import { MAX_IMAGES, useImageSelection } from '../src/hooks/useImageSelection';
import { useRecipeStore } from '../src/store/recipeStore';

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { images, isLoading, error, pickFromLibrary, pickFromCamera, removeImage } =
    useImageSelection();
  const setSelectedImages = useRecipeStore((state) => state.setSelectedImages);

  const atLimit = images.length >= MAX_IMAGES;
  const controlsDisabled = atLimit || isLoading;
  const canProceed = images.length > 0 && !isLoading;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + tokens.spacing.md, paddingBottom: insets.bottom },
      ]}
    >
      <Text style={styles.title}>Recipe Planner</Text>
      <Text style={styles.subtitle}>
        {images.length === 0
          ? 'Add photos of your ingredients'
          : `${images.length} / ${MAX_IMAGES} photo${images.length === 1 ? '' : 's'} selected`}
      </Text>

      {images.length > 0 ? (
        <FlatList
          data={images}
          keyExtractor={(item) => item.uri}
          numColumns={3}
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item, index }) => (
            <View style={styles.thumb}>
              <Image
                source={{ uri: item.uri }}
                style={styles.thumbImage}
                accessibilityIgnoresInvertColors
              />
              <Pressable
                style={styles.removeBtn}
                onPress={() => removeImage(item.uri)}
                accessibilityLabel={`Remove photo ${index + 1}`}
                accessibilityRole="button"
              >
                <Text style={styles.removeBtnText}>X</Text>
              </Pressable>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyState} accessibilityLabel="No photos selected">
          <Text style={styles.emptyText}>No photos yet. Tap below to add some.</Text>
        </View>
      )}

      {isLoading && (
        <ActivityIndicator
          size="large"
          color={tokens.colors.primary}
          style={styles.loader}
          accessibilityLabel="Processing photos..."
        />
      )}

      {error && (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            (pressed || controlsDisabled) && styles.actionBtnMuted,
          ]}
          onPress={pickFromCamera}
          disabled={controlsDisabled}
          accessibilityLabel="Take a photo with camera"
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnText}>Camera</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            (pressed || controlsDisabled) && styles.actionBtnMuted,
          ]}
          onPress={pickFromLibrary}
          disabled={controlsDisabled}
          accessibilityLabel="Pick photos from library"
          accessibilityRole="button"
        >
          <Text style={styles.actionBtnText}>Library</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.proceedBtn,
          !canProceed && styles.proceedBtnDisabled,
          pressed && canProceed && styles.pressed,
        ]}
        onPress={() => {
          setSelectedImages(images);
          router.push('/recipes');
        }}
        disabled={!canProceed}
        accessibilityLabel="Find recipes from selected photos"
        accessibilityRole="button"
      >
        <Text style={[styles.proceedBtnText, !canProceed && styles.proceedBtnTextDisabled]}>
          Find Recipes
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
  title: {
    fontSize: tokens.fontSize.xl,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSecondary,
    marginTop: tokens.spacing.xs,
    marginBottom: tokens.spacing.md,
  },
  grid: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: tokens.spacing.md,
  },
  gridRow: {
    alignItems: 'flex-start',
  },
  thumb: {
    width: '33.3333%',
    aspectRatio: 1,
    padding: tokens.spacing.xs / 2,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.skeleton,
  },
  removeBtn: {
    position: 'absolute',
    top: tokens.spacing.xs / 2,
    right: tokens.spacing.xs / 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: tokens.radius.full,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#fff',
    fontSize: tokens.fontSize.sm,
    fontWeight: '700',
    lineHeight: tokens.fontSize.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: tokens.fontSize.md,
    color: tokens.colors.textMuted,
    textAlign: 'center',
  },
  loader: {
    marginVertical: tokens.spacing.md,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: tokens.colors.error,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    padding: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
  },
  errorText: {
    color: tokens.colors.error,
    fontSize: tokens.fontSize.sm,
    lineHeight: tokens.fontSize.sm * tokens.lineHeight.normal,
  },
  actions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  actionBtnMuted: {
    opacity: 0.45,
  },
  actionBtnText: {
    fontSize: tokens.fontSize.md,
    fontWeight: '600',
    color: tokens.colors.text,
  },
  proceedBtn: {
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  proceedBtnDisabled: {
    backgroundColor: tokens.colors.border,
  },
  proceedBtnText: {
    fontSize: tokens.fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  proceedBtnTextDisabled: {
    color: tokens.colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
});
