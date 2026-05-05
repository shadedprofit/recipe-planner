import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { Recipe } from 'recipe-planner-shared';
import RecipeDetailScreen from '../app/recipes/[id]';
import { initialRecipeState, useRecipeStore } from '../src/store/recipeStore';
import { ApiError } from '../src/api/client';

const mockBack = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockGetRecipe = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../src/api/client', () => {
  class ApiError extends Error {
    status: number;
    details: unknown;
    constructor(message: string, status: number, details?: unknown) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.details = details;
    }
  }
  return {
    ApiError,
    getRecipe: (id: string) => mockGetRecipe(id),
  };
});

const sampleRecipe: Recipe = {
  id: 'recipe-1',
  title: 'Garlic Butter Pasta',
  description: 'Simple pantry pasta with browned butter and garlic.',
  totalTimeMinutes: 25,
  servings: 4,
  ingredients: [
    { name: 'spaghetti', quantity: '12', unit: 'oz' },
    { name: 'garlic', quantity: '4', unit: 'cloves' },
    { name: 'salt', quantity: '', unit: '' },
  ],
  steps: ['Boil water and cook the pasta.', 'Brown the butter with garlic.', 'Toss and serve.'],
  tags: ['quick', 'vegetarian'],
};

describe('RecipeDetailScreen', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockUseLocalSearchParams.mockReset();
    mockGetRecipe.mockReset();
    useRecipeStore.setState(initialRecipeState);
  });

  it('renders the recipe matching the route id from the in-memory store without fetching', () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'recipe-1' });
    useRecipeStore.setState({ recipes: [sampleRecipe] });

    render(<RecipeDetailScreen />);

    expect(screen.getByText('Garlic Butter Pasta')).toBeTruthy();
    expect(screen.getByText('Simple pantry pasta with browned butter and garlic.')).toBeTruthy();
    expect(screen.getByText('25 min')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('quick')).toBeTruthy();
    expect(screen.getByText('vegetarian')).toBeTruthy();
    expect(screen.getByText('12 oz spaghetti')).toBeTruthy();
    expect(screen.getByText('4 cloves garlic')).toBeTruthy();
    expect(screen.getByText('salt')).toBeTruthy();
    expect(screen.getByText('Boil water and cook the pasta.')).toBeTruthy();
    expect(screen.getByText('Brown the butter with garlic.')).toBeTruthy();
    expect(screen.getByText('Toss and serve.')).toBeTruthy();
    expect(mockGetRecipe).not.toHaveBeenCalled();
  });

  it('shows a loading state and then renders a recipe fetched from the server on cold start', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'recipe-1' });
    let resolveFetch: (recipe: Recipe) => void = () => undefined;
    mockGetRecipe.mockImplementation(
      () =>
        new Promise<Recipe>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(<RecipeDetailScreen />);

    expect(screen.getByText('Loading recipe...')).toBeTruthy();
    expect(mockGetRecipe).toHaveBeenCalledWith('recipe-1');

    resolveFetch(sampleRecipe);

    await waitFor(() => {
      expect(screen.getByText('Garlic Butter Pasta')).toBeTruthy();
    });
  });

  it('does not render a stale fetched recipe after the route id changes', async () => {
    let currentId = 'recipe-1';
    const secondRecipe = { ...sampleRecipe, id: 'recipe-2', title: 'Tomato Rice' };
    mockUseLocalSearchParams.mockImplementation(() => ({ id: currentId }));
    mockGetRecipe.mockImplementation((id: string) =>
      Promise.resolve(id === 'recipe-1' ? sampleRecipe : secondRecipe),
    );

    const { rerender } = render(<RecipeDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Garlic Butter Pasta')).toBeTruthy();
    });

    currentId = 'recipe-2';
    rerender(<RecipeDetailScreen />);

    expect(screen.queryByText('Garlic Butter Pasta')).toBeNull();

    await waitFor(() => {
      expect(screen.getByText('Tomato Rice')).toBeTruthy();
    });
  });

  it('shows the unavailable state when the server returns 404', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'missing' });
    mockGetRecipe.mockRejectedValue(new ApiError('Recipe not found', 404));

    render(<RecipeDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Recipe unavailable')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Go back to recipes'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows an error state when the fetch fails for a non-404 reason', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'recipe-1' });
    mockGetRecipe.mockRejectedValue(new Error('network down'));

    render(<RecipeDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Could not load recipe')).toBeTruthy();
      expect(screen.getByText('network down')).toBeTruthy();
    });
  });
});
