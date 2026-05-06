import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Ingredient, Recipe } from 'recipe-planner-shared';
import type { SelectedImage } from '../hooks/useImageSelection';

interface RecipeState {
  selectedImages: SelectedImage[];
  detectedIngredients: Ingredient[];
  recipes: Recipe[];
  seenRecipeIds: string[];
}

interface RecipeActions {
  setSelectedImages: (images: SelectedImage[]) => void;
  setDetectedIngredients: (ingredients: Ingredient[]) => void;
  setRecipes: (recipes: Recipe[]) => void;
  addSeenRecipeIds: (ids: string[]) => void;
  clearHistory: () => void;
  clearSession: () => void;
}

export type RecipeStore = RecipeState & RecipeActions;

export const initialRecipeState: RecipeState = {
  selectedImages: [],
  detectedIngredients: [],
  recipes: [],
  seenRecipeIds: [],
};

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

function sameImages(a: SelectedImage[], b: SelectedImage[]): boolean {
  return (
    a.length === b.length &&
    a.every((image, i) => image.uri === b[i]?.uri && image.base64 === b[i]?.base64)
  );
}

function stripImagePayloads(images: SelectedImage[]): SelectedImage[] {
  return images.map((image) => ({ uri: image.uri, base64: '' }));
}

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set) => ({
      ...initialRecipeState,
      setSelectedImages: (images) =>
        set((state) => {
          if (sameImages(state.selectedImages, images)) {
            return { selectedImages: images };
          }

          return {
            selectedImages: images,
            detectedIngredients: [],
            recipes: [],
          };
        }),
      setDetectedIngredients: (ingredients) => set({ detectedIngredients: ingredients }),
      setRecipes: (recipes) => set({ recipes }),
      addSeenRecipeIds: (ids) =>
        set((state) => ({
          seenRecipeIds: uniqueIds([...state.seenRecipeIds, ...ids]),
        })),
      clearHistory: () => set({ seenRecipeIds: [] }),
      clearSession: () =>
        set({
          selectedImages: [],
          detectedIngredients: [],
          recipes: [],
        }),
    }),
    {
      name: 'recipe-planner-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedImages: stripImagePayloads(state.selectedImages),
        detectedIngredients: state.detectedIngredients,
        recipes: state.recipes,
        seenRecipeIds: state.seenRecipeIds,
      }),
    },
  ),
);
