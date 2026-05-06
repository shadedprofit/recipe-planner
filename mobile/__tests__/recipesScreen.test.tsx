import { Alert, Platform, type AlertButton } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import type { Recipe } from 'recipe-planner-shared';
import RecipesScreen from '../app/recipes';
import * as apiClient from '../src/api/client';
import { initialRecipeState, useRecipeStore } from '../src/store/recipeStore';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockStorage = new Map<string, string>();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
    useRecipeStore.setState(initialRecipeState);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
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
    mockGenerateRecipes.mockResolvedValue({ recipes: buildRecipes('refresh') });

    renderScreen();
    fireEvent.press(screen.getByText('Refresh Recipes'));

    await waitFor(() => expect(mockGenerateRecipes).toHaveBeenCalledTimes(1));
    expect(mockExtractIngredients).not.toHaveBeenCalled();
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

  it('does not extract when a recovered photo no longer has image data', async () => {
    useRecipeStore.setState({
      selectedImages: [{ uri: 'file://photo.jpg', base64: '' }],
    });

    renderScreen();

    expect(
      await screen.findByText(
        'Photo data is no longer available. Start over and add photos again.',
      ),
    ).toBeTruthy();
    expect(mockExtractIngredients).not.toHaveBeenCalled();
    expect(mockGenerateRecipes).not.toHaveBeenCalled();
  });

  it('shows a friendly message when the model returns malformed recipe data', async () => {
    useRecipeStore.setState({
      selectedImages: [{ uri: 'file://photo.jpg', base64: 'base64-photo' }],
    });
    mockExtractIngredients.mockResolvedValue({
      ingredients: [{ name: 'egg', confidence: 0.9 }],
    });
    mockGenerateRecipes.mockRejectedValue(
      new Error('Gemini returned malformed data for generate_recipes: Unterminated string'),
    );

    renderScreen();

    expect(
      await screen.findByText(
        'The recipe model returned an incomplete response. Please try again.',
      ),
    ).toBeTruthy();
  });

  it('shows a friendly message when the model is temporarily unavailable', async () => {
    useRecipeStore.setState({
      selectedImages: [{ uri: 'file://photo.jpg', base64: 'base64-photo' }],
    });
    mockExtractIngredients.mockResolvedValue({
      ingredients: [{ name: 'egg', confidence: 0.9 }],
    });
    mockGenerateRecipes.mockRejectedValue(
      new Error(
        'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later. status":"UNAVAILABLE"',
      ),
    );

    renderScreen();

    expect(
      await screen.findByText('The AI model is temporarily busy. Please try again in a minute.'),
    ).toBeTruthy();
  });

  it('shows a friendly message when Gemini quota is exhausted', async () => {
    useRecipeStore.setState({
      selectedImages: [{ uri: 'file://photo.jpg', base64: 'base64-photo' }],
    });
    mockExtractIngredients.mockRejectedValue(
      new Error('{"error":{"code":429,"message":"Quota exceeded","status":"RESOURCE_EXHAUSTED"}}'),
    );

    renderScreen();

    expect(
      await screen.findByText(
        'The demo has used up its Gemini API quota for now. Please try again after the quota resets.',
      ),
    ).toBeTruthy();
  });

  it('confirms before clearing the current run and seen recipe history', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    useRecipeStore.setState({
      selectedImages: [{ uri: 'file://photo.jpg', base64: 'base64-photo' }],
      detectedIngredients: [{ name: 'egg', confidence: 0.9 }],
      recipes: buildRecipes('current'),
      seenRecipeIds: ['old-recipe'],
    });

    renderScreen();
    fireEvent.press(screen.getByText('Start over'));

    const buttons = alertSpy.mock.calls[0][2] as AlertButton[];
    act(() => {
      buttons[1].onPress?.();
    });

    expect(useRecipeStore.getState().selectedImages).toEqual([]);
    expect(useRecipeStore.getState().detectedIngredients).toEqual([]);
    expect(useRecipeStore.getState().recipes).toEqual([]);
    expect(useRecipeStore.getState().seenRecipeIds).toEqual([]);
    expect(mockReplace).toHaveBeenCalledWith('/');
    alertSpy.mockRestore();
  });

  it('uses an in-app confirmation modal before clearing on web', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    useRecipeStore.setState({
      selectedImages: [{ uri: 'file://photo.jpg', base64: 'base64-photo' }],
      recipes: buildRecipes('current'),
      seenRecipeIds: ['old-recipe'],
    });

    renderScreen();
    fireEvent.press(screen.getByText('Start over'));

    expect(screen.getByText('Start over?')).toBeTruthy();
    expect(screen.getByLabelText('Confirm start over')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Confirm start over'));

    expect(useRecipeStore.getState().selectedImages).toEqual([]);
    expect(useRecipeStore.getState().recipes).toEqual([]);
    expect(useRecipeStore.getState().seenRecipeIds).toEqual([]);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('cancels the web clear confirmation without resetting state', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    useRecipeStore.setState({
      selectedImages: [{ uri: 'file://photo.jpg', base64: 'base64-photo' }],
      recipes: buildRecipes('current'),
      seenRecipeIds: ['old-recipe'],
    });

    renderScreen();
    fireEvent.press(screen.getByText('Start over'));
    fireEvent.press(screen.getByLabelText('Cancel start over'));

    expect(screen.queryByText('Start over?')).toBeNull();
    expect(useRecipeStore.getState().selectedImages).toHaveLength(1);
    expect(useRecipeStore.getState().recipes).toHaveLength(5);
    expect(useRecipeStore.getState().seenRecipeIds).toEqual(['old-recipe']);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
