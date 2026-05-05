const mockGenerateWithClaude = jest.fn();
const mockGenerateWithGemini = jest.fn();

jest.mock('../src/services/claude', () => ({
  CLAUDE_MODEL: 'claude-test-model',
  generateRecipes: mockGenerateWithClaude,
}));

jest.mock('../src/services/gemini', () => ({
  DEFAULT_GEMINI_RECIPE_MODEL: 'gemini-test-model',
  generateRecipesWithGemini: mockGenerateWithGemini,
}));

import {
  DEFAULT_RECIPE_GENERATION_PROVIDER,
  generateRecipes,
  getRecipeGenerationModel,
  getRecipeGenerationProvider,
} from '../src/services/recipeGeneration';

beforeEach(() => {
  mockGenerateWithClaude.mockReset();
  mockGenerateWithGemini.mockReset();
  delete process.env.RECIPE_GENERATION_PROVIDER;
  delete process.env.GEMINI_RECIPE_MODEL;
});

afterAll(() => {
  delete process.env.RECIPE_GENERATION_PROVIDER;
  delete process.env.GEMINI_RECIPE_MODEL;
});

describe('getRecipeGenerationProvider', () => {
  it('defaults to Gemini', () => {
    expect(getRecipeGenerationProvider()).toBe(DEFAULT_RECIPE_GENERATION_PROVIDER);
    expect(DEFAULT_RECIPE_GENERATION_PROVIDER).toBe('gemini');
  });

  it('normalizes configured provider values', () => {
    process.env.RECIPE_GENERATION_PROVIDER = ' Claude ';

    expect(getRecipeGenerationProvider()).toBe('claude');
  });

  it('throws for unsupported provider values', () => {
    process.env.RECIPE_GENERATION_PROVIDER = 'openai';

    expect(() => getRecipeGenerationProvider()).toThrow('RECIPE_GENERATION_PROVIDER');
  });
});

describe('getRecipeGenerationModel', () => {
  it('returns the default Gemini recipe model by default', () => {
    expect(getRecipeGenerationModel()).toBe('gemini-test-model');
  });

  it('returns a Gemini override when configured', () => {
    process.env.GEMINI_RECIPE_MODEL = 'gemini-override';

    expect(getRecipeGenerationModel()).toBe('gemini-override');
  });

  it('returns the Claude model when Claude is configured', () => {
    process.env.RECIPE_GENERATION_PROVIDER = 'claude';

    expect(getRecipeGenerationModel()).toBe('claude-test-model');
  });
});

describe('generateRecipes', () => {
  it('uses Gemini when no provider is configured', async () => {
    mockGenerateWithGemini.mockResolvedValue({ recipes: [] });

    await generateRecipes(['egg'], ['old-id']);

    expect(mockGenerateWithGemini).toHaveBeenCalledWith(['egg'], ['old-id']);
    expect(mockGenerateWithClaude).not.toHaveBeenCalled();
  });

  it('uses Claude when configured', async () => {
    process.env.RECIPE_GENERATION_PROVIDER = 'claude';
    mockGenerateWithClaude.mockResolvedValue({ recipes: [] });

    await generateRecipes(['egg'], []);

    expect(mockGenerateWithClaude).toHaveBeenCalledWith(['egg'], []);
    expect(mockGenerateWithGemini).not.toHaveBeenCalled();
  });
});
