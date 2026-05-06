const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  __esModule: true,
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

import { GoogleGenAI } from '@google/genai';
import {
  DEFAULT_GEMINI_INGREDIENT_MODEL,
  DEFAULT_GEMINI_RECIPE_MODEL,
  extractIngredientsWithGemini,
  generateRecipesWithGemini,
} from '../src/services/gemini';

const MockGoogleGenAI = GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>;

const buildRecipes = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `recipe-${i}`,
    title: `Recipe ${i}`,
    description: 'Desc',
    totalTimeMinutes: 20,
    servings: 2,
    ingredients: [{ name: 'egg', quantity: '2', unit: '' }],
    steps: ['Cook it'],
    tags: [],
  }));

beforeEach(() => {
  mockGenerateContent.mockReset();
  MockGoogleGenAI.mockClear();
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  delete process.env.GEMINI_INGREDIENT_MODEL;
  delete process.env.GEMINI_RECIPE_MODEL;
});

afterAll(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_INGREDIENT_MODEL;
  delete process.env.GEMINI_RECIPE_MODEL;
});

describe('extractIngredientsWithGemini', () => {
  it('defaults ingredient extraction to the higher-accuracy Gemini Flash model', () => {
    expect(DEFAULT_GEMINI_INGREDIENT_MODEL).toBe('gemini-2.5-flash');
  });

  it('returns parsed ingredients from a valid structured response', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        ingredients: [{ name: 'tomato', confidence: 0.91 }],
      }),
    });

    const result = await extractIngredientsWithGemini(['base64img']);

    expect(result.ingredients).toEqual([{ name: 'tomato', confidence: 0.91 }]);
    expect(MockGoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-gemini-key' });
  });

  it('passes one inline image part per image followed by extraction instructions', async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ ingredients: [] }) });

    await extractIngredientsWithGemini(['a', 'b', 'c']);

    const call = mockGenerateContent.mock.calls[0][0];
    const parts = call.contents[0].parts;
    const imageParts = parts.filter((part: { inlineData?: unknown }) => part.inlineData);
    expect(imageParts).toHaveLength(3);
    expect(imageParts[0].inlineData).toEqual({ mimeType: 'image/jpeg', data: 'a' });
    expect(parts.at(-1).text).toContain('Identify every distinct edible ingredient');
  });

  it('requests JSON output with the shared extraction response schema', async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ ingredients: [] }) });

    await extractIngredientsWithGemini(['a']);

    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.model).toBe(DEFAULT_GEMINI_INGREDIENT_MODEL);
    expect(call.config.responseMimeType).toBe('application/json');
    expect(call.config.responseJsonSchema).toMatchObject({
      type: 'object',
      properties: { ingredients: expect.any(Object) },
      required: ['ingredients'],
    });
    expect(call.config.responseJsonSchema.$schema).toBeUndefined();
  });

  it('uses GEMINI_INGREDIENT_MODEL when configured', async () => {
    process.env.GEMINI_INGREDIENT_MODEL = 'gemini-custom';
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ ingredients: [] }) });

    await extractIngredientsWithGemini(['a']);

    expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-custom');
  });

  it('retries transient Gemini availability errors before surfacing extraction failures', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(
        new Error('This model is currently experiencing high demand. status":"UNAVAILABLE"'),
      )
      .mockResolvedValueOnce({
        text: JSON.stringify({
          ingredients: [{ name: 'tomato', confidence: 0.91 }],
        }),
      });

    const result = await extractIngredientsWithGemini(['base64img']);

    expect(result.ingredients).toEqual([{ name: 'tomato', confidence: 0.91 }]);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('sanitizes extraction quota errors without retrying', async () => {
    mockGenerateContent.mockRejectedValue(
      new Error('{"error":{"code":429,"message":"Quota exceeded","status":"RESOURCE_EXHAUSTED"}}'),
    );

    await expect(extractIngredientsWithGemini(['base64img'])).rejects.toThrow(
      'Gemini API quota exceeded',
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('does not treat unrelated 429 text as an extraction quota error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Recipe note 429 was not helpful'));

    await expect(extractIngredientsWithGemini(['base64img'])).rejects.toThrow(
      'Recipe note 429 was not helpful',
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('throws when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(extractIngredientsWithGemini(['a'])).rejects.toThrow('GEMINI_API_KEY');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('throws when Gemini returns no text', async () => {
    mockGenerateContent.mockResolvedValue({});

    await expect(extractIngredientsWithGemini(['a'])).rejects.toThrow('no text');
  });

  it('wraps malformed JSON or schema failures as plain errors', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ ingredients: [{ name: '', confidence: 2 }] }),
    });

    await expect(extractIngredientsWithGemini(['a'])).rejects.toThrow('malformed');
  });

  it('wraps invalid JSON text as a plain error', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'not-json' });

    await expect(extractIngredientsWithGemini(['a'])).rejects.toThrow('malformed');
  });
});

describe('generateRecipesWithGemini', () => {
  it('returns parsed recipes from a valid structured response', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ recipes: buildRecipes(5) }),
    });

    const result = await generateRecipesWithGemini(['egg', 'butter'], []);

    expect(result.recipes).toHaveLength(5);
    expect(MockGoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-gemini-key' });
  });

  it('requests JSON output with the shared recipe response shape', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ recipes: buildRecipes(5) }),
    });

    await generateRecipesWithGemini(['egg'], []);

    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.model).toBe(DEFAULT_GEMINI_RECIPE_MODEL);
    expect(call.config.responseMimeType).toBe('application/json');
    expect(call.config.maxOutputTokens).toBe(8192);
    expect(call.config.responseJsonSchema).toMatchObject({
      type: 'object',
      properties: { recipes: expect.any(Object) },
      required: ['recipes'],
    });
    expect(call.config.responseJsonSchema.$schema).toBeUndefined();
  });

  it('uses GEMINI_RECIPE_MODEL when configured', async () => {
    process.env.GEMINI_RECIPE_MODEL = 'gemini-recipe-custom';
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ recipes: buildRecipes(5) }),
    });

    await generateRecipesWithGemini(['egg'], []);

    expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-recipe-custom');
  });

  it('interpolates excludeRecipeIds into the user prompt', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ recipes: buildRecipes(5) }),
    });

    await generateRecipesWithGemini(['egg'], ['r1', 'r2']);

    const prompt = mockGenerateContent.mock.calls[0][0].contents[0].parts[0].text;
    expect(prompt).toContain('r1');
    expect(prompt).toContain('r2');
  });

  it('retries once with stricter instructions when recipe JSON is malformed', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: '{"recipes":[{"id":"truncated"' })
      .mockResolvedValueOnce({
        text: JSON.stringify({ recipes: buildRecipes(5) }),
      });

    const result = await generateRecipesWithGemini(['egg'], ['old-recipe']);

    expect(result.recipes).toHaveLength(5);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGenerateContent.mock.calls[0][0].config.temperature).toBe(0.7);
    expect(mockGenerateContent.mock.calls[1][0].config.temperature).toBe(0.2);
    expect(mockGenerateContent.mock.calls[1][0].contents[0].parts[0].text).toContain(
      'previous response was incomplete or invalid JSON',
    );
    expect(mockGenerateContent.mock.calls[1][0].contents[0].parts[0].text).toContain('old-recipe');
  });

  it('throws the malformed recipe error after both retry attempts fail', async () => {
    mockGenerateContent.mockResolvedValue({ text: '{"recipes":[{"id":"truncated"' });

    await expect(generateRecipesWithGemini(['egg'], [])).rejects.toThrow(
      'Gemini returned malformed data for generate_recipes',
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });

  it('retries transient Gemini availability errors before surfacing them', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(
        new Error('This model is currently experiencing high demand. status":"UNAVAILABLE"'),
      )
      .mockResolvedValueOnce({ text: JSON.stringify({ recipes: buildRecipes(5) }) });

    const result = await generateRecipesWithGemini(['egg'], []);

    expect(result.recipes).toHaveLength(5);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGenerateContent.mock.calls[1][0].config.temperature).toBe(0.2);
  });

  it('sanitizes recipe quota errors without retrying', async () => {
    mockGenerateContent.mockRejectedValue(
      new Error('{"error":{"code":429,"message":"Quota exceeded","status":"RESOURCE_EXHAUSTED"}}'),
    );

    await expect(generateRecipesWithGemini(['egg'], [])).rejects.toThrow(
      'Gemini API quota exceeded',
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('does not treat unrelated 429 text as a recipe quota error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Recipe note 429 was not helpful'));

    await expect(generateRecipesWithGemini(['egg'], [])).rejects.toThrow(
      'Recipe note 429 was not helpful',
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('does not retry non-transient Gemini errors', async () => {
    mockGenerateContent.mockRejectedValue(new Error('GEMINI_API_KEY is invalid'));

    await expect(generateRecipesWithGemini(['egg'], [])).rejects.toThrow(
      'GEMINI_API_KEY is invalid',
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('throws when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(generateRecipesWithGemini(['egg'], [])).rejects.toThrow('GEMINI_API_KEY');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('throws when Gemini returns no text for recipes', async () => {
    mockGenerateContent.mockResolvedValue({});

    await expect(generateRecipesWithGemini(['egg'], [])).rejects.toThrow('no text');
  });

  it('wraps malformed recipe data as a plain error', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ recipes: buildRecipes(3) }),
    });

    await expect(generateRecipesWithGemini(['egg'], [])).rejects.toThrow('malformed');
  });
});
