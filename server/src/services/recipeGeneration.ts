import { type GenerateRecipesResponse } from 'recipe-planner-shared';
import { CLAUDE_MODEL, generateRecipes as generateRecipesWithClaude } from './claude';
import { DEFAULT_GEMINI_RECIPE_MODEL, generateRecipesWithGemini } from './gemini';

export type RecipeGenerationProvider = 'gemini' | 'claude';

export const DEFAULT_RECIPE_GENERATION_PROVIDER: RecipeGenerationProvider = 'gemini';

const PROVIDERS: RecipeGenerationProvider[] = ['gemini', 'claude'];

export function getRecipeGenerationProvider(): RecipeGenerationProvider {
  const raw = process.env.RECIPE_GENERATION_PROVIDER ?? DEFAULT_RECIPE_GENERATION_PROVIDER;
  const provider = raw.trim().toLowerCase();
  if (PROVIDERS.includes(provider as RecipeGenerationProvider)) {
    return provider as RecipeGenerationProvider;
  }
  throw new Error(`RECIPE_GENERATION_PROVIDER must be one of: ${PROVIDERS.join(', ')}`);
}

export function getRecipeGenerationModel(): string {
  const provider = getRecipeGenerationProvider();
  if (provider === 'claude') {
    return CLAUDE_MODEL;
  }
  return process.env.GEMINI_RECIPE_MODEL ?? DEFAULT_GEMINI_RECIPE_MODEL;
}

export async function generateRecipes(
  ingredients: string[],
  excludeRecipeIds: string[],
): Promise<GenerateRecipesResponse> {
  const provider = getRecipeGenerationProvider();
  if (provider === 'claude') {
    return generateRecipesWithClaude(ingredients, excludeRecipeIds);
  }
  return generateRecipesWithGemini(ingredients, excludeRecipeIds);
}
