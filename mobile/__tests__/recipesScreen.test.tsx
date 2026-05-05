import { Alert, type AlertButton } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import type { Recipe } from 'recipe-planner-shared';
import RecipesScreen from '../app/recipes';
import * as apiClient from '../src/api/client';
import { initialRecipeState, useRecipeStore } from '../src/store/recipeStore';

const mockPush = jest.fn();
const mockStorage = new Map<string, string>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

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

jest.mock('../src/api/client', () => ({
  extractIngredients: jest.fn(),
  generateRecipes: jest.fn(),
}));

const mockExtractIngredients = apiClient.extractIngredients as jest.MockedFunction<
  typeof apiClient.extractIngredients
>;
const mockGenerateRecipes = apiClient.generateRecipes as jest.MockedFunction<
  typeof apiClient.generateRecipes
>;

function buildRecipes(prefix = 'recipe'): Recipe[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: `${prefix}-${i}`,
    title: `Recipe ${i}`,
    description: 'A practical dinner.',
    totalTimeMinutes: 25,
    servings: 2,
    ingredients: [{ name: 'egg', quantity: '2', unit: '' }],
    steps: ['Cook it'],
    tags: ['quick'],
  }));
}

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false },
      mutations: { gcTime: Infinity, retry: false },
    },
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderScreen() {
  return render(<RecipesScreen />, { wrapper });
}

describe('RecipesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    useRecipeStore.setState(initialRecipeState);
  });

  it('extracts ingredients before generating the initial recipe list', async () => {
    const recipes = buildRecipes();
    useRecipeStore.setState({
      selectedImages: [{ uri: 'file://photo.jpg', base64: 'base64-photo' }],
      seenRecipeIds: ['old-recipe'],
    });
    mockExtractIngredients.mockResolvedValue({
      ingredients: [{ name: 'egg', confidence: 0.9 }],
    });
    mockGenerateRecipes.mockResolvedValue({ recipes });

    renderScreen();

    await waitFor(() => expect(mockGenerateRecipes).toHaveBeenCalledTimes(1));

    expect(mockExtractIngredients).toHaveBeenCalledWith({ images: ['base64-photo'] });
    expect(mockGenerateRecipes).toHaveBeenCalledWith({
      ingredients: ['egg'],
      excludeRecipeIds: ['old-recipe'],
    });
    expect(mockExtractIngredients.mock.invocationCallOrder[0]).toBeLessThan(
      mockGenerateRecipes.mock.invocationCallOrder[0],
    );
    expect(await screen.findByText('Recipe 0')).toBeTruthy();
    expect(useRecipeStore.getState().seenRecipeIds).toEqual([
      'old-recipe',
      ...recipes.map((recipe) => recipe.id),
    ]);
  });

  it('refreshes recipes with the current seen recipe ids', async () => {
    useRecipeStore.setState({
      selectedImages: [{ uri: 'file://photo.jpg', base64: 'base64-photo' }],
      detectedIngredients: [{ name: 'egg', confidence: 0.9 }],
      recipes: buildRecipes('current'),
      seenRecipeIds: ['old-recipe', 'current-0'],
    });
    mockExtractIngredients.mockResolvedValue({
      ingredients: [{ name: 'egg', confidence: 0.9 }],
    });
    mockGenerateRecipes.mockResolvedValue({ recipes: buildRecipes('refresh') });

    renderScreen();
    fireEvent.press(screen.getByText('Refresh Recipes'));

    await waitFor(() => expect(mockGenerateRecipes).toHaveBeenCalledTimes(1));
    expect(mockGenerateRecipes).toHaveBeenCalledWith({
      ingredients: ['egg'],
      excludeRecipeIds: ['old-recipe', 'current-0'],
    });
  });

  it('shows an empty state when no photos have been selected', () => {
    renderScreen();

    expect(screen.getByText('No photos selected')).toBeTruthy();
    expect(screen.getByText('Go back and add ingredient photos first.')).toBeTruthy();
  });

  it('shows an error when no ingredients are extracted', async () => {
    useRecipeStore.setState({
      selectedImages: [{ uri: 'file://photo.jpg', base64: 'base64-photo' }],
    });
    mockExtractIngredients.mockResolvedValue({ ingredients: [] });

    renderScreen();

    expect(await screen.findByText('No ingredients were found. Try a clearer photo.')).toBeTruthy();
    expect(mockGenerateRecipes).not.toHaveBeenCalled();
  });

  it('confirms before clearing seen recipe history', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    useRecipeStore.setState({ seenRecipeIds: ['old-recipe'] });

    renderScreen();
    fireEvent.press(screen.getByText('Clear'));

    const buttons = alertSpy.mock.calls[0][2] as AlertButton[];
    act(() => {
      buttons[1].onPress?.();
    });

    expect(useRecipeStore.getState().seenRecipeIds).toEqual([]);
    alertSpy.mockRestore();
  });
});
