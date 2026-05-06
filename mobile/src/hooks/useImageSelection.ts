import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface SelectedImage {
  uri: string;
  base64: string;
}

export interface UseImageSelectionReturn {
  images: SelectedImage[];
  isLoading: boolean;
  error: string | null;
  addImage: (image: SelectedImage) => void;
  addImageFromUri: (uri: string) => Promise<void>;
  pickFromLibrary: () => Promise<void>;
  pickFromCamera: () => Promise<void>;
  removeImage: (uri: string) => void;
  clearImages: () => void;
  clearError: () => void;
}

export const MAX_IMAGES = 10;
const RESIZE_WIDTH = 1024;
const COMPRESS = 0.7;
const PROCESSING_ERROR = 'Could not process that photo. Please try another image.';
const PICKER_ERROR = 'Could not open photos. Please try again.';
const CAMERA_ERROR = 'Could not open the camera. Please try again.';
const MAX_IMAGES_ERROR = `Maximum ${MAX_IMAGES} photos reached.`;

async function resizeToBase64(uri: string): Promise<SelectedImage> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: RESIZE_WIDTH }).renderAsync();
  const result = await ref.saveAsync({ format: SaveFormat.JPEG, compress: COMPRESS, base64: true });
  if (!result.base64) {
    throw new Error('Image processing did not return base64 data');
  }
  return { uri: result.uri, base64: result.base64 };
}

export function useImageSelection(): UseImageSelectionReturn {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addImage = useCallback((image: SelectedImage) => {
    setImages((prev) => {
      if (prev.length >= MAX_IMAGES) {
        setError(MAX_IMAGES_ERROR);
        return prev;
      }
      setError(null);
      return [...prev, image].slice(0, MAX_IMAGES);
    });
  }, []);

  const addImageFromUri = useCallback(
    async (uri: string) => {
      if (images.length >= MAX_IMAGES) return;
      setError(null);
      try {
        setIsLoading(true);
        const processed = await resizeToBase64(uri);
        addImage(processed);
      } catch {
        setError(PROCESSING_ERROR);
      } finally {
        setIsLoading(false);
      }
    },
    [images.length, addImage],
  );

  const pickFromLibrary = async () => {
    setError(null);
    const remainingSlots = MAX_IMAGES - images.length;
    if (remainingSlots <= 0) return;

    let processingStarted = false;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Photo library access is required to add images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) return;

      processingStarted = true;
      setIsLoading(true);
      const processed = await Promise.all(
        result.assets.slice(0, remainingSlots).map((a) => resizeToBase64(a.uri)),
      );
      setImages((prev) => [...prev, ...processed].slice(0, MAX_IMAGES));
    } catch {
      setError(processingStarted ? PROCESSING_ERROR : PICKER_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const pickFromCamera = async () => {
    setError(null);
    if (images.length >= MAX_IMAGES) return;

    let processingStarted = false;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera access is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ quality: 1 });

      if (result.canceled || !result.assets?.[0]) return;

      processingStarted = true;
      setIsLoading(true);
      const processed = await resizeToBase64(result.assets[0].uri);
      setImages((prev) => [...prev, processed].slice(0, MAX_IMAGES));
    } catch {
      setError(processingStarted ? PROCESSING_ERROR : CAMERA_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((img) => img.uri !== uri));
  };

  const clearImages = () => setImages([]);
  const clearError = () => setError(null);

  return {
    images,
    isLoading,
    error,
    addImage,
    addImageFromUri,
    pickFromLibrary,
    pickFromCamera,
    removeImage,
    clearImages,
    clearError,
  };
}
