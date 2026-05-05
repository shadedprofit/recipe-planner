import { GoogleGenAI, type Part } from '@google/genai';
import { ZodError } from 'zod';
import {
  ExtractIngredientsResponseSchema,
  GenerateRecipesResponseSchema,
  type ExtractIngredientsResponse,
  type GenerateRecipesResponse,
} from 'recipe-planner-shared';

export const DEFAULT_GEMINI_INGREDIENT_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_RECIPE_MODEL = 'gemini-2.5-flash';

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
      throw new Error(`Gemini returned malformed data for ${operation}: ${err.message}`);
    }
    throw err;
  }
}

export async function extractIngredientsWithGemini(
  images: string[],
): Promise<ExtractIngredientsResponse> {
  const imageParts: Part[] = images.map((data) => ({
    inlineData: { mimeType: 'image/jpeg', data },
  }));

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

  return parseGeminiJson(response.text, 'extract_ingredients', ExtractIngredientsResponseSchema);
}

export async function generateRecipesWithGemini(
  ingredients: string[],
  excludeRecipeIds: string[],
): Promise<GenerateRecipesResponse> {
  const excludeClause =
    excludeRecipeIds.length > 0
      ? ` Do not include any recipe with these ids: ${excludeRecipeIds.join(', ')}.`
      : '';

  const response = await getClient().models.generateContent({
    model: getRecipeModel(),
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              `I have these ingredients available: ${ingredients.join(', ')}.` +
              `${excludeClause} Generate exactly 5 delicious, distinct recipes I can make. ` +
              'Each recipe must have a unique, stable, human-readable id like "pasta-pomodoro". ' +
              'Use the available ingredients as the foundation, but reasonable pantry staples are allowed.',
          },
        ],
      },
    ],
    config: {
      temperature: 0.8,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseJsonSchema: RECIPE_RESPONSE_JSON_SCHEMA,
    },
  });

  if (!response.text) {
    throw new Error('Gemini returned no text for generate_recipes');
  }

  return parseGeminiJson(response.text, 'generate_recipes', GenerateRecipesResponseSchema);
}
