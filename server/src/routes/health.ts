import { Router } from 'express';
import { DEFAULT_GEMINI_RECIPE_MODEL } from '../services/gemini';
import { getRecipeGenerationModel } from '../services/recipeGeneration';

export const DEFAULT_HEALTH_MODEL = DEFAULT_GEMINI_RECIPE_MODEL;

export const healthRouter: Router = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ ok: true, model: getRecipeGenerationModel() });
});
