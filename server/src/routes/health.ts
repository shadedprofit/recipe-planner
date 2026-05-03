import { Router } from 'express';

export const CLAUDE_MODEL = 'claude-sonnet-4-6';

export const healthRouter: Router = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ ok: true, model: CLAUDE_MODEL });
});
