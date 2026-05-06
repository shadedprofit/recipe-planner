import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { MAX_IMAGES } from './useImageSelection';

interface Props {
  containerRef: { readonly current: unknown };
  addImageFromUri: (uri: string) => Promise<void>;
  imageCount: number;
}

export function useWebDropZone({ containerRef, addImageFromUri, imageCount }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const addImageFromUriRef = useRef(addImageFromUri);
  const imageCountRef = useRef(imageCount);

  useEffect(() => {
    addImageFromUriRef.current = addImageFromUri;
  }, [addImageFromUri]);

  useEffect(() => {
    imageCountRef.current = imageCount;
  }, [imageCount]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = containerRef.current as HTMLElement | null;
    if (!el) return;

    const onDragEnter = (e: Event) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const onDragOver = (e: Event) => {
      e.preventDefault();
    };
    const onDragLeave = (e: Event) => {
      const drag = e as DragEvent;
      if (!el.contains(drag.relatedTarget as Node)) {
        setIsDragging(false);
      }
    };
    const onDrop = async (e: Event) => {
      e.preventDefault();
      setIsDragging(false);
      const drag = e as DragEvent;
      const files = Array.from(drag.dataTransfer?.files ?? []).filter((f) =>
        f.type.startsWith('image/'),
      );
      let added = 0;
      for (const file of files) {
        if (imageCountRef.current + added >= MAX_IMAGES) break;
        const uri = URL.createObjectURL(file);
        try {
          await addImageFromUriRef.current(uri);
        } finally {
          URL.revokeObjectURL(uri);
        }
        added++;
      }
    };

    el.addEventListener('dragenter', onDragEnter);
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragenter', onDragEnter);
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, [containerRef]);

  return { isDragging };
}
