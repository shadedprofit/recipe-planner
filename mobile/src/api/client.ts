import {
  ExtractIngredientsResponseSchema,
  GenerateRecipesResponseSchema,
  type ExtractIngredientsRequest,
  type ExtractIngredientsResponse,
  type GenerateRecipesRequest,
  type GenerateRecipesResponse,
} from 'recipe-planner-shared';

interface ApiClientTestGlobal {
  __RECIPE_PLANNER_API_URL__?: string;
}

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function getApiUrl(): string {
  const testApiUrl =
    process.env.NODE_ENV === 'test'
      ? (globalThis as typeof globalThis & ApiClientTestGlobal).__RECIPE_PLANNER_API_URL__
      : undefined;
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? testApiUrl;
  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not set. Configure it in mobile/.env.local.');
  }
  return apiUrl.replace(/\/$/, '');
}

async function postJson<TResponse>(
  path: string,
  body: unknown,
  parseResponse: (value: unknown) => TResponse,
): Promise<TResponse> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return parseResponse(payload);
}

export async function extractIngredients(
  request: ExtractIngredientsRequest,
): Promise<ExtractIngredientsResponse> {
  return postJson('/api/ingredients/extract', request, (payload) =>
    ExtractIngredientsResponseSchema.parse(payload),
  );
}

export async function generateRecipes(
  request: GenerateRecipesRequest,
): Promise<GenerateRecipesResponse> {
  return postJson('/api/recipes/generate', request, (payload) =>
    GenerateRecipesResponseSchema.parse(payload),
  );
}
