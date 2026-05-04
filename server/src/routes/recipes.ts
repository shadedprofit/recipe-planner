import { Router } from 'express';
import { GenerateRecipesRequestSchema } from 'recipe-planner-shared';
import { generateRecipes } from '../services/claude';

export const recipesRouter: Router = Router();

recipesRouter.post('/generate', async (req, res, next) => {
  try {
    const { ingredients, excludeRecipeIds } = GenerateRecipesRequestSchema.parse(req.body);
    const result = await generateRecipes(ingredients, excludeRecipeIds);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
