import {
  IngredientSchema,
  RecipeIngredientSchema,
  RecipeSchema,
  ExtractIngredientsRequestSchema,
  ExtractIngredientsResponseSchema,
  GenerateRecipesRequestSchema,
  GenerateRecipesResponseSchema,
  type Recipe,
} from '../src/schemas';

const validRecipe: Recipe = {
  id: 'r1',
  title: 'Pasta Pomodoro',
  description: 'Simple Italian classic.',
  totalTimeMinutes: 25,
  servings: 4,
  ingredients: [{ name: 'pasta', quantity: '1', unit: 'lb' }],
  steps: ['Boil water', 'Cook pasta'],
  tags: ['italian', 'easy'],
};

describe('IngredientSchema', () => {
  it('accepts a valid ingredient', () => {
    expect(IngredientSchema.parse({ name: 'tomato', confidence: 0.92 })).toEqual({
      name: 'tomato',
      confidence: 0.92,
    });
  });

  it('rejects an empty name', () => {
    expect(() => IngredientSchema.parse({ name: '', confidence: 0.5 })).toThrow();
  });

  it('rejects confidence above 1', () => {
    expect(() => IngredientSchema.parse({ name: 'x', confidence: 1.5 })).toThrow();
  });

  it('rejects negative confidence', () => {
    expect(() => IngredientSchema.parse({ name: 'x', confidence: -0.1 })).toThrow();
  });

  it('rejects missing fields', () => {
    expect(() => IngredientSchema.parse({ name: 'x' })).toThrow();
  });
});

describe('RecipeIngredientSchema', () => {
  it('accepts a valid recipe ingredient', () => {
    expect(RecipeIngredientSchema.parse({ name: 'flour', quantity: '2', unit: 'cup' })).toEqual({
      name: 'flour',
      quantity: '2',
      unit: 'cup',
    });
  });

  it('allows an empty unit (e.g. "salt to taste")', () => {
    expect(() =>
      RecipeIngredientSchema.parse({ name: 'salt', quantity: 'to taste', unit: '' }),
    ).not.toThrow();
  });

  it('rejects an empty name', () => {
    expect(() => RecipeIngredientSchema.parse({ name: '', quantity: '1', unit: 'cup' })).toThrow();
  });
});

describe('RecipeSchema', () => {
  it('accepts a valid recipe', () => {
    expect(RecipeSchema.parse(validRecipe)).toEqual(validRecipe);
  });

  it('rejects servings of 0', () => {
    expect(() => RecipeSchema.parse({ ...validRecipe, servings: 0 })).toThrow();
  });

  it('rejects an empty steps array', () => {
    expect(() => RecipeSchema.parse({ ...validRecipe, steps: [] })).toThrow();
  });

  it('rejects an empty ingredients array', () => {
    expect(() => RecipeSchema.parse({ ...validRecipe, ingredients: [] })).toThrow();
  });

  it('rejects negative totalTimeMinutes', () => {
    expect(() => RecipeSchema.parse({ ...validRecipe, totalTimeMinutes: -5 })).toThrow();
  });

  it('rejects non-integer servings', () => {
    expect(() => RecipeSchema.parse({ ...validRecipe, servings: 2.5 })).toThrow();
  });

  it('rejects an empty step string', () => {
    expect(() => RecipeSchema.parse({ ...validRecipe, steps: [''] })).toThrow();
  });

  it('accepts an empty tags array', () => {
    expect(() => RecipeSchema.parse({ ...validRecipe, tags: [] })).not.toThrow();
  });
});

describe('ExtractIngredientsRequestSchema', () => {
  it('requires at least one image', () => {
    expect(() => ExtractIngredientsRequestSchema.parse({ images: [] })).toThrow();
  });

  it('rejects more than 10 images', () => {
    const images = Array(11).fill('XXX');
    expect(() => ExtractIngredientsRequestSchema.parse({ images })).toThrow();
  });

  it('accepts 1 image', () => {
    expect(ExtractIngredientsRequestSchema.parse({ images: ['XXX'] })).toEqual({
      images: ['XXX'],
    });
  });

  it('accepts 10 images', () => {
    const images = Array(10).fill('XXX');
    expect(ExtractIngredientsRequestSchema.parse({ images })).toEqual({ images });
  });

  it('rejects empty image strings', () => {
    expect(() => ExtractIngredientsRequestSchema.parse({ images: [''] })).toThrow();
  });
});

describe('ExtractIngredientsResponseSchema', () => {
  it('accepts an empty ingredient list', () => {
    expect(ExtractIngredientsResponseSchema.parse({ ingredients: [] })).toEqual({
      ingredients: [],
    });
  });

  it('validates nested ingredients', () => {
    expect(() =>
      ExtractIngredientsResponseSchema.parse({ ingredients: [{ name: '', confidence: 0.5 }] }),
    ).toThrow();
  });
});

describe('GenerateRecipesRequestSchema', () => {
  it('requires at least one ingredient', () => {
    expect(() =>
      GenerateRecipesRequestSchema.parse({ ingredients: [], excludeRecipeIds: [] }),
    ).toThrow();
  });

  it('defaults excludeRecipeIds to an empty array', () => {
    expect(GenerateRecipesRequestSchema.parse({ ingredients: ['tomato'] })).toEqual({
      ingredients: ['tomato'],
      excludeRecipeIds: [],
    });
  });

  it('accepts a populated excludeRecipeIds list', () => {
    expect(
      GenerateRecipesRequestSchema.parse({
        ingredients: ['tomato'],
        excludeRecipeIds: ['r1', 'r2'],
      }),
    ).toEqual({ ingredients: ['tomato'], excludeRecipeIds: ['r1', 'r2'] });
  });

  it('rejects empty ingredient strings', () => {
    expect(() => GenerateRecipesRequestSchema.parse({ ingredients: [''] })).toThrow();
  });
});

describe('GenerateRecipesResponseSchema', () => {
  const buildN = (n: number): Recipe[] =>
    Array.from({ length: n }, (_, i) => ({ ...validRecipe, id: `r${i}` }));

  it('rejects 4 recipes', () => {
    expect(() => GenerateRecipesResponseSchema.parse({ recipes: buildN(4) })).toThrow();
  });

  it('rejects 6 recipes', () => {
    expect(() => GenerateRecipesResponseSchema.parse({ recipes: buildN(6) })).toThrow();
  });

  it('accepts exactly 5 recipes', () => {
    expect(() => GenerateRecipesResponseSchema.parse({ recipes: buildN(5) })).not.toThrow();
  });
});
