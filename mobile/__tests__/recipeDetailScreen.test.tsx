import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Recipe } from 'recipe-planner-shared';
import RecipeDetailScreen from '../app/recipes/[id]';
import { initialRecipeState, useRecipeStore } from '../src/store/recipeStore';

const mockBack = jest.fn();
const mockUseLocalSearchParams = jest.fn();

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
    useRecipeStore.setState(initialRecipeState);
  });

  it('renders the recipe matching the route id', () => {
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
  });

  it('shows an unavailable state and lets the user navigate back when the recipe is missing', () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'missing' });
    useRecipeStore.setState({ recipes: [sampleRecipe] });

    render(<RecipeDetailScreen />);

    expect(screen.getByText('Recipe unavailable')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Go back to recipes'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
