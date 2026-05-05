import request from 'supertest';
import { createApp } from '../src/app';
import * as ingredientExtractionService from '../src/services/ingredientExtraction';

jest.mock('../src/services/ingredientExtraction');

const app = createApp();
const mockExtract = ingredientExtractionService.extractIngredients as jest.MockedFunction<
  typeof ingredientExtractionService.extractIngredients
>;

beforeEach(() => mockExtract.mockReset());

describe('POST /api/ingredients/extract', () => {
  it('returns extracted ingredients for a valid request', async () => {
    mockExtract.mockResolvedValue({
      ingredients: [
        { name: 'tomato', confidence: 0.95 },
        { name: 'basil', confidence: 0.88 },
      ],
    });

    const res = await request(app)
      .post('/api/ingredients/extract')
      .send({ images: ['fakebase64'] });

    expect(res.status).toBe(200);
    expect(res.body.ingredients).toHaveLength(2);
    expect(res.body.ingredients[0].name).toBe('tomato');
    expect(mockExtract).toHaveBeenCalledWith(['fakebase64']);
  });

  it('calls the service with all provided images', async () => {
    mockExtract.mockResolvedValue({ ingredients: [] });

    await request(app)
      .post('/api/ingredients/extract')
      .send({ images: ['a', 'b', 'c'] });

    expect(mockExtract).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('returns 400 for an empty images array', async () => {
    const res = await request(app).post('/api/ingredients/extract').send({ images: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('returns 400 for more than 10 images', async () => {
    const images = Array(11).fill('xxx');
    const res = await request(app).post('/api/ingredients/extract').send({ images });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('returns 400 when images field is missing', async () => {
    const res = await request(app).post('/api/ingredients/extract').send({});
    expect(res.status).toBe(400);
  });

  it('returns 500 when the extraction service throws', async () => {
    mockExtract.mockRejectedValue(new Error('API unavailable'));
    const res = await request(app)
      .post('/api/ingredients/extract')
      .send({ images: ['fakebase64'] });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('API unavailable');
  });

  it('returns an empty ingredients list when no ingredients are found', async () => {
    mockExtract.mockResolvedValue({ ingredients: [] });
    const res = await request(app)
      .post('/api/ingredients/extract')
      .send({ images: ['fakebase64'] });
    expect(res.status).toBe(200);
    expect(res.body.ingredients).toEqual([]);
  });
});
