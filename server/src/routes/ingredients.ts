import { Router } from 'express';
import { ExtractIngredientsRequestSchema } from 'recipe-planner-shared';
import { extractIngredients } from '../services/claude';

export const ingredientsRouter: Router = Router();

ingredientsRouter.post('/extract', async (req, res, next) => {
  try {
    const { images } = ExtractIngredientsRequestSchema.parse(req.body);
    const result = await extractIngredients(images);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
