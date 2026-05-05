import type { Recipe } from 'recipe-planner-shared';
import { closeDb } from '../src/db/database';
import { getRecipeById, saveRecipes } from '../src/services/recipeStore';

const ORIGINAL_DB_PATH = process.env.RECIPE_DB_PATH;

const buildRecipe = (id: string, overrides: Partial<Recipe> = {}): Recipe => ({
  id,
  title: `Recipe ${id}`,
  description: 'A simple dish.',
  totalTimeMinutes: 25,
  servings: 4,
  ingredients: [{ name: 'egg', quantity: '2', unit: '' }],
  steps: ['Cook it'],
  tags: ['quick'],
  ...overrides,
});

beforeEach(() => {
  process.env.RECIPE_DB_PATH = ':memory:';
  closeDb();
});

afterAll(() => {
  closeDb();
  if (ORIGINAL_DB_PATH === undefined) {
    delete process.env.RECIPE_DB_PATH;
  } else {
    process.env.RECIPE_DB_PATH = ORIGINAL_DB_PATH;
  }
});

describe('recipe store', () => {
  it('persists generated recipes and reads them back by id', () => {
    const recipe = buildRecipe('pasta-pomodoro');
    saveRecipes([recipe]);
    expect(getRecipeById('pasta-pomodoro')).toEqual(recipe);
  });

  it('returns null for unknown ids', () => {
    expect(getRecipeById('does-not-exist')).toBeNull();
  });

  it('saves a batch atomically and is idempotent for known ids', () => {
    const first = buildRecipe('a');
    const second = buildRecipe('b');
    saveRecipes([first, second]);

    const updated = buildRecipe('a', { title: 'NEW TITLE' });
    saveRecipes([updated, buildRecipe('c')]);

    expect(getRecipeById('a')?.title).toBe('Recipe a');
    expect(getRecipeById('b')?.title).toBe('Recipe b');
    expect(getRecipeById('c')?.title).toBe('Recipe c');
  });
});
