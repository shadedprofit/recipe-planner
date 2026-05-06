import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ingredient, Recipe } from 'recipe-planner-shared';
import { initialRecipeState, useRecipeStore } from '../src/store/recipeStore';

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStorage.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockStorage.clear();
      return Promise.resolve();
    }),
  },
}));

const sampleRecipe = (id: string): Recipe => ({
  id,
  title: `Recipe ${id}`,
  description: 'Simple and good.',
  totalTimeMinutes: 20,
  servings: 2,
  ingredients: [{ name: 'egg', quantity: '2', unit: '' }],
  steps: ['Cook it'],
  tags: ['quick'],
});

const sampleIngredient: Ingredient = { name: 'egg', confidence: 0.9 };

describe('recipeStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useRecipeStore.setState(initialRecipeState);
  });

  it('stores selected images and clears previous generated state', () => {
    useRecipeStore.getState().setDetectedIngredients([sampleIngredient]);
    useRecipeStore.getState().setRecipes([sampleRecipe('old')]);

    useRecipeStore.getState().setSelectedImages([{ uri: 'file://photo.jpg', base64: 'base64' }]);

    expect(useRecipeStore.getState().selectedImages).toEqual([
      { uri: 'file://photo.jpg', base64: 'base64' },
    ]);
    expect(useRecipeStore.getState().detectedIngredients).toEqual([]);
    expect(useRecipeStore.getState().recipes).toEqual([]);
  });

  it('keeps generated state when setting the same selected images again', () => {
    const image = { uri: 'file://photo.jpg', base64: 'base64' };
    const recipe = sampleRecipe('existing');

    useRecipeStore.getState().setSelectedImages([image]);
    useRecipeStore.getState().setDetectedIngredients([sampleIngredient]);
    useRecipeStore.getState().setRecipes([recipe]);
    useRecipeStore.getState().setSelectedImages([{ ...image }]);

    expect(useRecipeStore.getState().selectedImages).toEqual([image]);
    expect(useRecipeStore.getState().detectedIngredients).toEqual([sampleIngredient]);
    expect(useRecipeStore.getState().recipes).toEqual([recipe]);
  });

  it('stores detected ingredients and recipes', () => {
    const recipes = [
      sampleRecipe('r1'),
      sampleRecipe('r2'),
      sampleRecipe('r3'),
      sampleRecipe('r4'),
      sampleRecipe('r5'),
    ];

    useRecipeStore.getState().setDetectedIngredients([sampleIngredient]);
    useRecipeStore.getState().setRecipes(recipes);

    expect(useRecipeStore.getState().detectedIngredients).toEqual([sampleIngredient]);
    expect(useRecipeStore.getState().recipes).toEqual(recipes);
  });

  it('persists the current recipe session for browser refresh recovery without image payloads', () => {
    const selectedImages = [{ uri: 'file://photo.jpg', base64: 'x'.repeat(250_000) }];
    const recipes = [sampleRecipe('r1')];

    useRecipeStore.getState().setSelectedImages(selectedImages);
    useRecipeStore.getState().setDetectedIngredients([sampleIngredient]);
    useRecipeStore.getState().setRecipes(recipes);
    useRecipeStore.getState().addSeenRecipeIds(['r1']);

    const persisted = mockStorage.get('recipe-planner-store');
    expect(persisted).toBeTruthy();
    expect(JSON.parse(persisted ?? '{}')).toMatchObject({
      state: {
        selectedImages: [{ uri: 'file://photo.jpg', base64: '' }],
        detectedIngredients: [sampleIngredient],
        recipes,
        seenRecipeIds: ['r1'],
      },
    });
    expect(persisted).not.toContain(selectedImages[0].base64);
  });

  it('deduplicates seen recipe ids while preserving insertion order', () => {
    useRecipeStore.getState().addSeenRecipeIds(['r1', 'r2']);
    useRecipeStore.getState().addSeenRecipeIds(['r2', 'r3']);

    expect(useRecipeStore.getState().seenRecipeIds).toEqual(['r1', 'r2', 'r3']);
  });

  it('clears seen recipe history separately from the current session', () => {
    useRecipeStore.getState().setRecipes([sampleRecipe('r1')]);
    useRecipeStore.getState().addSeenRecipeIds(['r1']);

    useRecipeStore.getState().clearHistory();

    expect(useRecipeStore.getState().seenRecipeIds).toEqual([]);
    expect(useRecipeStore.getState().recipes).toHaveLength(1);
  });

  it('clears current session state without clearing seen history', () => {
    useRecipeStore.getState().setSelectedImages([{ uri: 'file://photo.jpg', base64: 'base64' }]);
    useRecipeStore.getState().setDetectedIngredients([sampleIngredient]);
    useRecipeStore.getState().setRecipes([sampleRecipe('r1')]);
    useRecipeStore.getState().addSeenRecipeIds(['r1']);

    useRecipeStore.getState().clearSession();

    expect(useRecipeStore.getState().selectedImages).toEqual([]);
    expect(useRecipeStore.getState().detectedIngredients).toEqual([]);
    expect(useRecipeStore.getState().recipes).toEqual([]);
    expect(useRecipeStore.getState().seenRecipeIds).toEqual(['r1']);
  });
});
