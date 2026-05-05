import { Router } from 'express';
import { GenerateRecipesRequestSchema } from 'recipe-planner-shared';
import { generateRecipes } from '../services/recipeGeneration';
import { getRecipeById, saveRecipes } from '../services/recipeStore';

export const recipesRouter: Router = Router();

recipesRouter.post('/generate', async (req, res, next) => {
  try {
    const { ingredients, excludeRecipeIds } = GenerateRecipesRequestSchema.parse(req.body);
    const result = await generateRecipes(ingredients, excludeRecipeIds);
    saveRecipes(result.recipes);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

recipesRouter.get('/:id', (req, res, next) => {
  try {
    const recipe = getRecipeById(req.params.id);
    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    res.json({ recipe });
  } catch (err) {
    next(err);
  }
});
