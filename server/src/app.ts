import express, { type Express } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { ingredientsRouter } from './routes/ingredients';
import { recipesRouter } from './routes/recipes';
import { errorHandler, notFoundHandler } from './middleware/error';

export function createApp(): Express {
  const app = express();
  app.use(
    cors({
      origin: [
        'http://localhost:8080', // Expo web local development
        'http://localhost:3000', // Alternative local development
        'http://localhost:3001', // Local API server for Expo web
        'https://recipe-planner-epabon.vercel.app', // The Deployed Vercel URL
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true, // Optional: Only needed if your API uses cookies or authorization headers
    }),
  );
  app.use(express.json({ limit: '20mb' }));
  app.use('/health', healthRouter);
  app.use('/api/ingredients', ingredientsRouter);
  app.use('/api/recipes', recipesRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
