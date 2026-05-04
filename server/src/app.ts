import express, { type Express } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { ingredientsRouter } from './routes/ingredients';
import { recipesRouter } from './routes/recipes';
import { errorHandler, notFoundHandler } from './middleware/error';

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '20mb' }));
  app.use('/health', healthRouter);
  app.use('/api/ingredients', ingredientsRouter);
  app.use('/api/recipes', recipesRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
