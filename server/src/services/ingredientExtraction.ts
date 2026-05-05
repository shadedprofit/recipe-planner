import type { ExtractIngredientsResponse } from 'recipe-planner-shared';
import { extractIngredientsWithClaude } from './claude';
import { extractIngredientsWithGemini } from './gemini';

const PROVIDERS = ['gemini', 'claude'] as const;

export type IngredientExtractionProvider = (typeof PROVIDERS)[number];

export const DEFAULT_INGREDIENT_EXTRACTION_PROVIDER: IngredientExtractionProvider = 'gemini';

function isIngredientExtractionProvider(value: string): value is IngredientExtractionProvider {
  return PROVIDERS.some((provider) => provider === value);
}

export function getIngredientExtractionProvider(): IngredientExtractionProvider {
  const rawProvider =
    process.env.INGREDIENT_EXTRACTION_PROVIDER ?? DEFAULT_INGREDIENT_EXTRACTION_PROVIDER;
  const provider = rawProvider.trim().toLowerCase();

  if (isIngredientExtractionProvider(provider)) {
    return provider;
  }

  throw new Error(`INGREDIENT_EXTRACTION_PROVIDER must be one of: ${PROVIDERS.join(', ')}`);
}

export async function extractIngredients(images: string[]): Promise<ExtractIngredientsResponse> {
  const provider = getIngredientExtractionProvider();

  if (provider === 'gemini') return extractIngredientsWithGemini(images);
  return extractIngredientsWithClaude(images);
}
