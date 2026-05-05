import { extractIngredients, generateRecipes, getRecipe, ApiError } from '../src/api/client';

const originalFetch = global.fetch;

interface ApiClientTestGlobal {
  __RECIPE_PLANNER_API_URL__?: string;
}

const testGlobal = globalThis as typeof globalThis & ApiClientTestGlobal;

function mockResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('api client', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
    testGlobal.__RECIPE_PLANNER_API_URL__ = 'http://localhost:3001';
  });

  afterAll(() => {
    global.fetch = originalFetch;
    delete testGlobal.__RECIPE_PLANNER_API_URL__;
  });

  it('extractIngredients posts base64 images to the API', async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ ingredients: [{ name: 'tomato', confidence: 0.95 }] }),
    );

    const result = await extractIngredients({ images: ['base64-a'] });

    expect(result.ingredients).toEqual([{ name: 'tomato', confidence: 0.95 }]);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/ingredients/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: ['base64-a'] }),
    });
  });

  it('generateRecipes posts ingredients and excluded recipe ids', async () => {
    mockFetch.mockResolvedValue(
      mockResponse({
        recipes: Array.from({ length: 5 }, (_, i) => ({
          id: `recipe-${i}`,
          title: `Recipe ${i}`,
          description: 'A good dinner.',
          totalTimeMinutes: 25,
          servings: 2,
          ingredients: [{ name: 'egg', quantity: '2', unit: '' }],
          steps: ['Cook it'],
          tags: ['quick'],
        })),
      }),
    );

    const result = await generateRecipes({
      ingredients: ['egg'],
      excludeRecipeIds: ['old-recipe'],
    });

    expect(result.recipes).toHaveLength(5);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/recipes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: ['egg'], excludeRecipeIds: ['old-recipe'] }),
    });
  });

  it('throws ApiError with the server error message when a request fails', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(
        { error: 'Validation Error', details: { fieldErrors: {} } },
        { ok: false, status: 400 },
      ),
    );

    await expect(extractIngredients({ images: ['bad'] })).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Validation Error',
      status: 400,
      details: { error: 'Validation Error', details: { fieldErrors: {} } },
    });
  });

  it('rejects malformed successful responses', async () => {
    mockFetch.mockResolvedValue(mockResponse({ ingredients: [{ name: '', confidence: 2 }] }));

    await expect(extractIngredients({ images: ['base64-a'] })).rejects.toThrow();
  });

  it('throws a helpful error when the API URL is not configured', async () => {
    delete testGlobal.__RECIPE_PLANNER_API_URL__;

    await expect(extractIngredients({ images: ['base64-a'] })).rejects.toThrow(
      'EXPO_PUBLIC_API_URL is not set',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('getRecipe fetches a recipe by id and unwraps the payload', async () => {
    const recipe = {
      id: 'recipe-1',
      title: 'Recipe 1',
      description: 'desc',
      totalTimeMinutes: 25,
      servings: 2,
      ingredients: [{ name: 'egg', quantity: '2', unit: '' }],
      steps: ['Cook it'],
      tags: [],
    };
    mockFetch.mockResolvedValue(mockResponse({ recipe }));

    const result = await getRecipe('recipe-1');

    expect(result).toEqual(recipe);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/recipes/recipe-1', {
      method: 'GET',
    });
  });

  it('getRecipe encodes the id segment', async () => {
    const recipe = {
      id: 'pasta primavera',
      title: 'Pasta Primavera',
      description: '',
      totalTimeMinutes: 25,
      servings: 2,
      ingredients: [{ name: 'pasta', quantity: '8', unit: 'oz' }],
      steps: ['Cook the pasta.'],
      tags: [],
    };
    mockFetch.mockResolvedValue(mockResponse({ recipe }));

    await getRecipe('pasta primavera');

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/recipes/pasta%20primavera', {
      method: 'GET',
    });
  });

  it('getRecipe surfaces 404s as ApiError with status 404', async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ error: 'Recipe not found' }, { ok: false, status: 404 }),
    );

    await expect(getRecipe('missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Recipe not found',
    });
    expect(ApiError).toBeDefined();
  });
});
