import { GoogleGenAI, type Part } from '@google/genai';
import { ZodError } from 'zod';
import {
  ExtractIngredientsResponseSchema,
  GenerateRecipesResponseSchema,
  type ExtractIngredientsResponse,
  type GenerateRecipesResponse,
} from 'recipe-planner-shared';

export const DEFAULT_GEMINI_INGREDIENT_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_RECIPE_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_TRANSIENT_MAX_ATTEMPTS = 3;
const GEMINI_TRANSIENT_RETRY_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 750;
const RECIPE_GENERATION_MAX_ATTEMPTS = 3;

const INGREDIENT_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['name', 'confidence'],
      },
    },
  },
  required: ['ingredients'],
} satisfies Record<string, unknown>;

const RECIPE_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    recipes: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          totalTimeMinutes: { type: 'integer', minimum: 1 },
          servings: { type: 'integer', minimum: 1 },
          ingredients: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'string' },
                unit: { type: 'string' },
              },
              required: ['name', 'quantity', 'unit'],
            },
          },
          steps: {
            type: 'array',
            minItems: 1,
            items: { type: 'string' },
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: [
          'id',
          'title',
          'description',
          'totalTimeMinutes',
          'servings',
          'ingredients',
          'steps',
          'tags',
        ],
      },
    },
  },
  required: ['recipes'],
} satisfies Record<string, unknown>;

class GeminiMalformedDataError extends Error {
  constructor(operation: string, cause: SyntaxError | ZodError) {
    // The mobile demo maps this message family to a friendly retry prompt.
    super(`Gemini returned malformed data for ${operation}: ${cause.message}`);
    this.name = 'GeminiMalformedDataError';
  }
}

class GeminiQuotaExceededError extends Error {
  constructor() {
    // The Express error middleware maps this name to the mobile quota message.
    super('Gemini API quota exceeded. Please try again after the quota resets.');
    this.name = 'GeminiQuotaExceededError';
  }
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenAI({ apiKey });
}

function getIngredientModel(): string {
  return process.env.GEMINI_INGREDIENT_MODEL ?? DEFAULT_GEMINI_INGREDIENT_MODEL;
}

function getRecipeModel(): string {
  return process.env.GEMINI_RECIPE_MODEL ?? DEFAULT_GEMINI_RECIPE_MODEL;
}

function parseGeminiJson<T>(
  text: string,
  operation: string,
  schema: { parse: (value: unknown) => T },
): T {
  try {
    return schema.parse(JSON.parse(text));
  } catch (err) {
    if (err instanceof SyntaxError || err instanceof ZodError) {
      throw new GeminiMalformedDataError(operation, err);
    }
    throw err;
  }
}

function isTransientGeminiError(err: unknown): err is Error {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return (
    message.includes('unavailable') ||
    message.includes('high demand') ||
    message.includes('temporarily') ||
    message.includes('503')
  );
}

function isGeminiQuotaError(err: unknown): err is Error {
  if (!(err instanceof Error)) return false;
  const code = (err as Error & { code?: unknown; status?: unknown }).code;
  const status = (err as Error & { code?: unknown; status?: unknown }).status;
  if (code === 429 || status === 429) return true;

  const message = err.message.toLowerCase();
  return (
    message.includes('quota') ||
    message.includes('resource_exhausted') ||
    message.includes('rate-limit') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    /(?:code|status|status code|http status)["':=\s]*429\b/.test(message) ||
    /\b429\b.*(?:quota|resource_exhausted|rate-limit|rate limit|too many requests)/.test(message)
  );
}

function normalizeGeminiError(err: unknown): never {
  if (isGeminiQuotaError(err)) {
    throw new GeminiQuotaExceededError();
  }
  throw err;
}

async function waitBeforeGeminiRetry(attempt: number): Promise<void> {
  if (GEMINI_TRANSIENT_RETRY_DELAY_MS <= 0) return;
  await new Promise((resolve) =>
    setTimeout(resolve, GEMINI_TRANSIENT_RETRY_DELAY_MS * (attempt + 1)),
  );
}

function buildRecipePrompt(
  ingredients: string[],
  excludeRecipeIds: string[],
  isRetry: boolean,
): string {
  const excludeClause =
    excludeRecipeIds.length > 0
      ? ` Do not include any recipe with these ids: ${excludeRecipeIds.join(', ')}.`
      : '';
  const retryClause = isRetry
    ? ' Your previous response was incomplete or invalid JSON. Return one complete JSON object only, with no truncation.'
    : '';

  return (
    `I have these ingredients available: ${ingredients.join(', ')}.` +
    `${excludeClause} Generate exactly 5 delicious, distinct recipes I can make. ` +
    'Each recipe must have a unique, stable, human-readable id like "pasta-pomodoro". ' +
    'Use the available ingredients as the foundation, but reasonable pantry staples are allowed.' +
    retryClause
  );
}

export async function extractIngredientsWithGemini(
  images: string[],
): Promise<ExtractIngredientsResponse> {
  const imageParts: Part[] = images.map((data) => ({
    inlineData: { mimeType: 'image/jpeg', data },
  }));

  for (let attempt = 0; attempt < GEMINI_TRANSIENT_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await getClient().models.generateContent({
        model: getIngredientModel(),
        contents: [
          {
            role: 'user',
            parts: [
              ...imageParts,
              {
                text:
                  'Identify every distinct edible ingredient visible across all provided photos. ' +
                  'Return a deduplicated list with a confidence score from 0 to 1 for each ingredient. ' +
                  'Return an empty list when no ingredients are visible.',
              },
            ],
          },
        ],
        config: {
          temperature: 0,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          responseJsonSchema: INGREDIENT_RESPONSE_JSON_SCHEMA,
        },
      });

      if (!response.text) {
        throw new Error('Gemini returned no text for extract_ingredients');
      }

      return parseGeminiJson(
        response.text,
        'extract_ingredients',
        ExtractIngredientsResponseSchema,
      );
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        normalizeGeminiError(err);
      }
      if (isTransientGeminiError(err) && attempt < GEMINI_TRANSIENT_MAX_ATTEMPTS - 1) {
        await waitBeforeGeminiRetry(attempt);
        continue;
      }
      normalizeGeminiError(err);
    }
  }

  throw new Error('Gemini returned no text for extract_ingredients');
}

export async function generateRecipesWithGemini(
  ingredients: string[],
  excludeRecipeIds: string[],
): Promise<GenerateRecipesResponse> {
  for (let attempt = 0; attempt < RECIPE_GENERATION_MAX_ATTEMPTS; attempt += 1) {
    let response: Awaited<ReturnType<ReturnType<typeof getClient>['models']['generateContent']>>;
    try {
      response = await getClient().models.generateContent({
        model: getRecipeModel(),
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: buildRecipePrompt(ingredients, excludeRecipeIds, attempt > 0),
              },
            ],
          },
        ],
        config: {
          temperature: attempt === 0 ? 0.7 : 0.2,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseJsonSchema: RECIPE_RESPONSE_JSON_SCHEMA,
        },
      });
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        normalizeGeminiError(err);
      }
      if (isTransientGeminiError(err) && attempt < RECIPE_GENERATION_MAX_ATTEMPTS - 1) {
        await waitBeforeGeminiRetry(attempt);
        continue;
      }
      normalizeGeminiError(err);
    }

    if (!response.text) {
      throw new Error('Gemini returned no text for generate_recipes');
    }

    try {
      return parseGeminiJson(response.text, 'generate_recipes', GenerateRecipesResponseSchema);
    } catch (err) {
      if (err instanceof GeminiMalformedDataError && attempt < RECIPE_GENERATION_MAX_ATTEMPTS - 1) {
        await waitBeforeGeminiRetry(attempt);
        continue;
      }
      throw err;
    }
  }

  throw new Error('Gemini returned malformed data for generate_recipes');
}
