import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Camera, ImagePlus, Sparkles, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { tokens } from '../src/theme/tokens';
import { MAX_IMAGES, useImageSelection } from '../src/hooks/useImageSelection';
import { useRecipeStore } from '../src/store/recipeStore';
import { WebCameraCapture } from '../src/components/WebCameraCapture';
import { useResponsiveLayout } from '../src/hooks/useResponsiveLayout';
import { useWebDropZone } from '../src/hooks/useWebDropZone';

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const layout = useResponsiveLayout();
  const [isWebCameraOpen, setIsWebCameraOpen] = useState(false);
  const {
    images,
    isLoading,
    error,
    addImage,
    addImageFromUri,
    pickFromLibrary,
    pickFromCamera,
    removeImage,
  } = useImageSelection();
  const setSelectedImages = useRecipeStore((state) => state.setSelectedImages);
  const uploadContainerRef = useRef<View>(null);
  const { isDragging } = useWebDropZone({
    containerRef: uploadContainerRef,
    addImageFromUri,
    imageCount: images.length,
  });

  const atLimit = images.length >= MAX_IMAGES;
  const controlsDisabled = atLimit || isLoading;
  const canProceed = images.length > 0 && !isLoading;
  const gridColumns = layout.isDesktop ? 4 : 3;
  const handleCameraPress = () => {
    if (Platform.OS === 'web') {
      setIsWebCameraOpen(true);
      return;
    }

    void pickFromCamera();
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          layout.isWide && styles.scrollContentWide,
          {
            paddingTop: insets.top + tokens.spacing.lg,
            paddingBottom: insets.bottom + tokens.spacing.lg,
          },
        ]}
      >
        <View style={[styles.shell, layout.isWide && styles.shellWide]}>
          <View style={[styles.introPanel, layout.isWide && styles.introPanelWide]}>
            <View style={styles.brandHeader}>
              <View style={styles.brandMark}>
                <Sparkles size={22} color={tokens.colors.primaryStrong} strokeWidth={2.5} />
              </View>
              <Text style={styles.eyebrow}>Smart Recipe Planner</Text>
            </View>
            <Text style={styles.title}>Turn what you have into dinner.</Text>
            <Text style={styles.subtitle}>
              Add ingredient photos and get five practical recipe ideas built around what is
              visible.
            </Text>

            <View style={styles.counterPill}>
              <Text style={styles.counterText}>
                {images.length} / {MAX_IMAGES} photo{images.length === 1 ? '' : 's'} selected
              </Text>
            </View>

            {isLoading && (
              <View style={styles.statusPanel} accessibilityRole="alert">
                <ActivityIndicator color={tokens.colors.primary} />
                <Text style={styles.statusText}>Processing photos...</Text>
              </View>
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
                onPress={handleCameraPress}
                disabled={controlsDisabled}
                accessibilityLabel="Take a photo with camera"
                accessibilityRole="button"
              >
                <Camera size={19} color={tokens.colors.text} />
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
                <ImagePlus size={19} color={tokens.colors.text} />
                <Text style={styles.actionBtnText}>Library</Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.proceedBtn,
                !canProceed && styles.proceedBtnDisabled,
                pressed && canProceed && styles.pressed,
                Platform.OS === 'web' &&
                  ({ cursor: canProceed ? 'pointer' : 'not-allowed' } as object),
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

          <View
            ref={uploadContainerRef}
            style={[
              styles.photoPanel,
              layout.isWide && styles.photoPanelWide,
              Platform.OS === 'web' && isDragging && styles.photoPanelDragging,
            ]}
          >
            {images.length > 0 ? (
              <FlatList
                key={gridColumns}
                data={images}
                keyExtractor={(item) => item.uri}
                numColumns={gridColumns}
                scrollEnabled={false}
                contentContainerStyle={styles.gridContent}
                columnWrapperStyle={styles.gridRow}
                renderItem={({ item, index }) => (
                  <View style={[styles.thumb, { width: `${100 / gridColumns}%` }]}>
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.thumbImage}
                      accessibilityIgnoresInvertColors
                    />
                    <Pressable
                      style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                      onPress={() => removeImage(item.uri)}
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      accessibilityRole="button"
                    >
                      <X size={18} color={tokens.colors.surface} strokeWidth={2.8} />
                    </Pressable>
                  </View>
                )}
              />
            ) : (
              <View style={styles.emptyState} accessibilityLabel="No photos selected">
                <View style={styles.emptyIcon}>
                  <ImagePlus size={34} color={tokens.colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Add your ingredients</Text>
                <Text style={styles.emptyText}>
                  Use a counter shot, pantry haul, or a few close-ups. Clearer photos produce better
                  ideas.
                </Text>
                {Platform.OS === 'web' && (
                  <Text style={[styles.dropLabel, isDragging && styles.dropLabelActive]}>
                    {isDragging ? 'Release to add' : 'Drop photos here'}
                  </Text>
                )}
              </View>
            )}
            {Platform.OS === 'web' && isDragging && images.length > 0 && !atLimit && (
              <Text style={[styles.dropLabel, styles.dropLabelActive, styles.dropLabelGrid]}>
                Release to add
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <WebCameraCapture
        visible={isWebCameraOpen}
        onCapture={addImage}
        onClose={() => setIsWebCameraOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: tokens.spacing.md,
  },
  scrollContentWide: {
    justifyContent: 'center',
  },
  shell: {
    width: '100%',
    maxWidth: tokens.layout.maxContentWidth,
    alignSelf: 'center',
    gap: tokens.spacing.md,
  },
  shellWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: tokens.spacing.lg,
  },
  introPanel: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    padding: tokens.spacing.lg,
    ...tokens.shadow.card,
  },
  introPanelWide: {
    width: tokens.layout.sideRailWidth,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: tokens.colors.primary,
    fontSize: tokens.fontSize.sm,
    fontWeight: '800',
    letterSpacing: 0,
  },
  title: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.xxl,
    fontWeight: '800',
    lineHeight: tokens.fontSize.xxl * tokens.lineHeight.tight,
    marginTop: tokens.spacing.xs,
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.md,
    lineHeight: tokens.fontSize.md * tokens.lineHeight.normal,
    marginTop: tokens.spacing.sm,
  },
  counterPill: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.surfaceMuted,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    marginTop: tokens.spacing.lg,
  },
  counterText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.sm,
    fontWeight: '700',
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
  errorBanner: {
    backgroundColor: tokens.colors.errorMuted,
    borderColor: tokens.colors.error,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    padding: tokens.spacing.md,
    marginTop: tokens.spacing.md,
  },
  errorText: {
    color: tokens.colors.error,
    fontSize: tokens.fontSize.sm,
    lineHeight: tokens.fontSize.sm * tokens.lineHeight.normal,
  },
  actions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.lg,
  },
  actionBtn: {
    flex: 1,
    minHeight: 52,
    backgroundColor: tokens.colors.surfaceWarm,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  actionBtnMuted: {
    opacity: 0.45,
  },
  actionBtnText: {
    fontSize: tokens.fontSize.md,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  proceedBtn: {
    minHeight: 56,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
  },
  proceedBtnDisabled: {
    backgroundColor: tokens.colors.surfaceMuted,
    borderColor: tokens.colors.border,
    borderWidth: 1,
  },
  proceedBtnText: {
    fontSize: tokens.fontSize.md,
    fontWeight: '800',
    color: tokens.colors.surface,
  },
  proceedBtnTextDisabled: {
    color: tokens.colors.textSecondary,
  },
  photoPanel: {
    minHeight: 360,
    backgroundColor: tokens.colors.surfaceWarm,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    padding: tokens.spacing.sm,
    ...tokens.shadow.card,
  },
  photoPanelWide: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: tokens.spacing.xs,
  },
  gridRow: {
    alignItems: 'flex-start',
  },
  thumb: {
    aspectRatio: 1,
    padding: tokens.spacing.xs,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.skeleton,
  },
  removeBtn: {
    position: 'absolute',
    top: tokens.spacing.sm,
    right: tokens.spacing.sm,
    backgroundColor: 'rgba(32,26,22,0.72)',
    borderRadius: tokens.radius.full,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    minHeight: 340,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: tokens.spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.md,
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
    maxWidth: 420,
  },
  photoPanelDragging: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryMuted,
  },
  dropLabel: {
    color: tokens.colors.textMuted,
    fontSize: tokens.fontSize.sm,
    fontWeight: '600',
    marginTop: tokens.spacing.sm,
  },
  dropLabelActive: {
    color: tokens.colors.primary,
  },
  dropLabelGrid: {
    textAlign: 'center',
    paddingVertical: tokens.spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
