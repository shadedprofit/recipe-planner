import { z } from 'zod';

// Max base64 string length corresponding to 5 MB of decoded image data.
export const MAX_IMAGE_B64_LEN = Math.ceil((5 * 1024 * 1024) / 3) * 4;

export const IngredientSchema = z.object({
  name: z.string().min(1),
  confidence: z.number().min(0).max(1),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

export const RecipeIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.string(),
  unit: z.string(),
});
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;

export const RecipeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  totalTimeMinutes: z.number().int().positive(),
  servings: z.number().int().positive(),
  ingredients: z.array(RecipeIngredientSchema).min(1),
  steps: z.array(z.string().min(1)).min(1),
  tags: z.array(z.string()),
});
export type Recipe = z.infer<typeof RecipeSchema>;

export const ExtractIngredientsRequestSchema = z.object({
  images: z
    .array(z.string().min(1).max(MAX_IMAGE_B64_LEN, 'Image exceeds 5 MB decoded limit'))
    .min(1)
    .max(10),
});
export type ExtractIngredientsRequest = z.infer<typeof ExtractIngredientsRequestSchema>;

export const ExtractIngredientsResponseSchema = z.object({
  ingredients: z.array(IngredientSchema),
});
export type ExtractIngredientsResponse = z.infer<typeof ExtractIngredientsResponseSchema>;

export const GenerateRecipesRequestSchema = z.object({
  ingredients: z.array(z.string().min(1)).min(1),
  excludeRecipeIds: z.array(z.string()).default([]),
});
export type GenerateRecipesRequest = z.infer<typeof GenerateRecipesRequestSchema>;

export const GenerateRecipesResponseSchema = z
  .object({
    recipes: z.array(RecipeSchema).length(5),
  })
  .refine((data) => new Set(data.recipes.map((r) => r.id)).size === data.recipes.length, {
    message: 'Recipe IDs must be unique',
    path: ['recipes'],
  });
export type GenerateRecipesResponse = z.infer<typeof GenerateRecipesResponseSchema>;

export const GetRecipeResponseSchema = z.object({
  recipe: RecipeSchema,
});
export type GetRecipeResponse = z.infer<typeof GetRecipeResponseSchema>;
