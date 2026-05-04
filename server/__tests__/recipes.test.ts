import request from 'supertest';
import { createApp } from '../src/app';
import * as claudeService from '../src/services/claude';

jest.mock('../src/services/claude');

const app = createApp();
const mockGenerate = claudeService.generateRecipes as jest.MockedFunction<
  typeof claudeService.generateRecipes
>;

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

beforeEach(() => mockGenerate.mockReset());

describe('POST /api/recipes/generate', () => {
  it('returns 5 recipes for a valid request', async () => {
    mockGenerate.mockResolvedValue({ recipes: buildRecipes(5) });

    const res = await request(app)
      .post('/api/recipes/generate')
      .send({ ingredients: ['egg', 'butter'] });

    expect(res.status).toBe(200);
    expect(res.body.recipes).toHaveLength(5);
    expect(mockGenerate).toHaveBeenCalledWith(['egg', 'butter'], []);
  });

  it('passes excludeRecipeIds to the service', async () => {
    mockGenerate.mockResolvedValue({ recipes: buildRecipes(5) });

    await request(app)
      .post('/api/recipes/generate')
      .send({ ingredients: ['egg'], excludeRecipeIds: ['r1', 'r2'] });

    expect(mockGenerate).toHaveBeenCalledWith(['egg'], ['r1', 'r2']);
  });

  it('returns 400 when ingredients array is empty', async () => {
    const res = await request(app)
      .post('/api/recipes/generate')
      .send({ ingredients: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('returns 400 when ingredients field is missing', async () => {
    const res = await request(app).post('/api/recipes/generate').send({});
    expect(res.status).toBe(400);
  });

  it('returns 500 when the Claude service throws', async () => {
    mockGenerate.mockRejectedValue(new Error('model error'));
    const res = await request(app)
      .post('/api/recipes/generate')
      .send({ ingredients: ['egg'] });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('model error');
  });
});
