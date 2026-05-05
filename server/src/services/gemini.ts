import { GoogleGenAI, type Part } from '@google/genai';
import { ZodError } from 'zod';
import {
  ExtractIngredientsResponseSchema,
  type ExtractIngredientsResponse,
} from 'recipe-planner-shared';

export const DEFAULT_GEMINI_INGREDIENT_MODEL = 'gemini-2.5-flash';

const RESPONSE_JSON_SCHEMA = {
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

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenAI({ apiKey });
}

function getIngredientModel(): string {
  return process.env.GEMINI_INGREDIENT_MODEL ?? DEFAULT_GEMINI_INGREDIENT_MODEL;
}

function parseGeminiJson(text: string): ExtractIngredientsResponse {
  try {
    return ExtractIngredientsResponseSchema.parse(JSON.parse(text));
  } catch (err) {
    if (err instanceof SyntaxError || err instanceof ZodError) {
      throw new Error(`Gemini returned malformed data for extract_ingredients: ${err.message}`);
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
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
    },
  });

  if (!response.text) {
    throw new Error('Gemini returned no text for extract_ingredients');
  }

  return parseGeminiJson(response.text);
}
