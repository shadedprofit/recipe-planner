import { createElement, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../theme/tokens';
import type { SelectedImage } from '../hooks/useImageSelection';

interface WebCameraCaptureProps {
  visible: boolean;
  onCapture: (image: SelectedImage) => void;
  onClose: () => void;
}

const CAPTURE_WIDTH = 1024;
const CAPTURE_QUALITY = 0.7;
const videoStyle: CSSProperties = {
  width: '100%',
  maxHeight: 420,
  aspectRatio: '4 / 3',
  backgroundColor: '#111827',
  borderRadius: tokens.radius.md,
  objectFit: 'cover',
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function captureVideoFrame(
  video: HTMLVideoElement,
  documentRef: Document = globalThis.document,
): { ok: true; image: SelectedImage } | { ok: false; error: string } {
  if (video.videoWidth <= 0 || video.videoHeight <= 0) {
    return { ok: false, error: 'Camera is not ready yet.' };
  }

  const width = Math.min(CAPTURE_WIDTH, video.videoWidth);
  const height = Math.round(video.videoHeight * (width / video.videoWidth));
  const canvas = documentRef.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    return { ok: false, error: 'Could not capture a photo from the camera.' };
  }

  context.drawImage(video, 0, 0, width, height);
  const uri = canvas.toDataURL('image/jpeg', CAPTURE_QUALITY);
  const base64 = uri.split(',')[1];
  if (!base64) {
    return { ok: false, error: 'Could not capture a photo from the camera.' };
  }

  return { ok: true, image: { uri, base64 } };
}

export function WebCameraCapture({ visible, onCapture, onClose }: WebCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return undefined;

    let isCanceled = false;

    const startCamera = async () => {
      setError(null);
      setIsStarting(true);

      try {
        if (!globalThis.navigator?.mediaDevices?.getUserMedia) {
          setError('This browser does not support direct camera capture.');
          return;
        }

        const stream = await globalThis.navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        });

        if (isCanceled) {
          stopStream(stream);
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (isCanceled) return;
        setError('Could not open the camera. Check browser camera permissions and try again.');
      } finally {
        if (!isCanceled) setIsStarting(false);
      }
    };

    void startCamera();

    return () => {
      isCanceled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [visible]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) {
      setError('Camera is not ready yet.');
      return;
    }

    const result = captureVideoFrame(video);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    onCapture(result.image);
    onClose();
  };

  if (!visible || Platform.OS !== 'web') return null;

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <View style={styles.panel}>
        <Text style={styles.title}>Camera</Text>
        <View style={styles.preview}>
          {isStarting && (
            <ActivityIndicator
              size="large"
              color={tokens.colors.primary}
              accessibilityLabel="Starting camera"
            />
          )}
          {/*
            Expo ImagePicker opens a file input on desktop web, so this preview uses
            getUserMedia directly for the deployed browser demo.
          */}
          {createElement('video', {
            ref: videoRef,
            autoPlay: true,
            muted: true,
            playsInline: true,
            style: videoStyle,
            'aria-label': 'Camera preview',
          })}
        </View>
        {error && (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            onPress={onClose}
            accessibilityLabel="Close camera"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              (pressed || isStarting || Boolean(error)) && styles.primaryBtnMuted,
            ]}
            onPress={capturePhoto}
            disabled={isStarting || Boolean(error)}
            accessibilityLabel="Capture photo"
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>Capture</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    backgroundColor: 'rgba(17,24,39,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.md,
  },
  panel: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  title: {
    fontSize: tokens.fontSize.lg,
    fontWeight: '700',
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
  },
  preview: {
    minHeight: 260,
    borderRadius: tokens.radius.md,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
  primaryBtn: {
    flex: 1,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
  },
  primaryBtnMuted: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: tokens.fontSize.md,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.md,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
