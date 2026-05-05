import request from 'supertest';
import { createApp } from '../src/app';
import * as claudeService from '../src/services/claude';
import * as recipeStore from '../src/services/recipeStore';
import type { Recipe } from 'recipe-planner-shared';

jest.mock('../src/services/claude');
jest.mock('../src/services/recipeStore');

const app = createApp();
const mockGenerate = claudeService.generateRecipes as jest.MockedFunction<
  typeof claudeService.generateRecipes
>;
const mockSaveRecipes = recipeStore.saveRecipes as jest.MockedFunction<
  typeof recipeStore.saveRecipes
>;
const mockGetRecipeById = recipeStore.getRecipeById as jest.MockedFunction<
  typeof recipeStore.getRecipeById
>;

const buildRecipes = (n: number): Recipe[] =>
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
  mockGenerate.mockReset();
  mockSaveRecipes.mockReset();
  mockGetRecipeById.mockReset();
});

describe('POST /api/recipes/generate', () => {
  it('returns 5 recipes and persists them to the recipe store', async () => {
    const recipes = buildRecipes(5);
    mockGenerate.mockResolvedValue({ recipes });

    const res = await request(app)
      .post('/api/recipes/generate')
      .send({ ingredients: ['egg', 'butter'] });

    expect(res.status).toBe(200);
    expect(res.body.recipes).toHaveLength(5);
    expect(mockGenerate).toHaveBeenCalledWith(['egg', 'butter'], []);
    expect(mockSaveRecipes).toHaveBeenCalledWith(recipes);
  });

  it('passes excludeRecipeIds to the service', async () => {
    mockGenerate.mockResolvedValue({ recipes: buildRecipes(5) });

    await request(app)
      .post('/api/recipes/generate')
      .send({ ingredients: ['egg'], excludeRecipeIds: ['r1', 'r2'] });

    expect(mockGenerate).toHaveBeenCalledWith(['egg'], ['r1', 'r2']);
  });

  it('returns 400 when ingredients array is empty', async () => {
    const res = await request(app).post('/api/recipes/generate').send({ ingredients: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(mockSaveRecipes).not.toHaveBeenCalled();
  });

  it('returns 400 when ingredients field is missing', async () => {
    const res = await request(app).post('/api/recipes/generate').send({});
    expect(res.status).toBe(400);
  });

  it('returns 500 when the Claude service throws and does not persist', async () => {
    mockGenerate.mockRejectedValue(new Error('model error'));
    const res = await request(app)
      .post('/api/recipes/generate')
      .send({ ingredients: ['egg'] });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('model error');
    expect(mockSaveRecipes).not.toHaveBeenCalled();
  });
});

describe('GET /api/recipes/:id', () => {
  it('returns the cached recipe wrapped in { recipe }', async () => {
    const [recipe] = buildRecipes(1);
    mockGetRecipeById.mockReturnValue(recipe);

    const res = await request(app).get('/api/recipes/recipe-0');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ recipe });
    expect(mockGetRecipeById).toHaveBeenCalledWith('recipe-0');
  });

  it('returns 404 when the id is unknown', async () => {
    mockGetRecipeById.mockReturnValue(null);

    const res = await request(app).get('/api/recipes/missing');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Recipe not found' });
  });

  it('returns 500 when the store throws', async () => {
    mockGetRecipeById.mockImplementation(() => {
      throw new Error('disk full');
    });

    const res = await request(app).get('/api/recipes/anything');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('disk full');
  });
});
