const mockExtractWithClaude = jest.fn();
const mockExtractWithGemini = jest.fn();

jest.mock('../src/services/claude', () => ({
  extractIngredients: mockExtractWithClaude,
  extractIngredientsWithClaude: mockExtractWithClaude,
}));

jest.mock('../src/services/gemini', () => ({
  extractIngredientsWithGemini: mockExtractWithGemini,
}));

import {
  DEFAULT_INGREDIENT_EXTRACTION_PROVIDER,
  extractIngredients,
  getIngredientExtractionProvider,
} from '../src/services/ingredientExtraction';

beforeEach(() => {
  mockExtractWithClaude.mockReset();
  mockExtractWithGemini.mockReset();
  delete process.env.INGREDIENT_EXTRACTION_PROVIDER;
});

afterAll(() => {
  delete process.env.INGREDIENT_EXTRACTION_PROVIDER;
});

describe('getIngredientExtractionProvider', () => {
  it('defaults to Gemini', () => {
    expect(getIngredientExtractionProvider()).toBe(DEFAULT_INGREDIENT_EXTRACTION_PROVIDER);
    expect(DEFAULT_INGREDIENT_EXTRACTION_PROVIDER).toBe('gemini');
  });

  it('normalizes configured provider values', () => {
    process.env.INGREDIENT_EXTRACTION_PROVIDER = ' Claude ';

    expect(getIngredientExtractionProvider()).toBe('claude');
  });

  it('throws for unsupported provider values', () => {
    process.env.INGREDIENT_EXTRACTION_PROVIDER = 'openai';

    expect(() => getIngredientExtractionProvider()).toThrow('INGREDIENT_EXTRACTION_PROVIDER');
  });
});

describe('extractIngredients', () => {
  it('uses Gemini when no provider is configured', async () => {
    mockExtractWithGemini.mockResolvedValue({ ingredients: [] });

    await extractIngredients(['base64img']);

    expect(mockExtractWithGemini).toHaveBeenCalledWith(['base64img']);
    expect(mockExtractWithClaude).not.toHaveBeenCalled();
  });

  it('uses Claude when configured', async () => {
    process.env.INGREDIENT_EXTRACTION_PROVIDER = 'claude';
    mockExtractWithClaude.mockResolvedValue({ ingredients: [] });

    await extractIngredients(['base64img']);

    expect(mockExtractWithClaude).toHaveBeenCalledWith(['base64img']);
    expect(mockExtractWithGemini).not.toHaveBeenCalled();
  });
});
