import request from 'supertest';
import express from 'express';
import { ZodError } from 'zod';
import { createApp } from '../src/app';
import { errorHandler, notFoundHandler } from '../src/middleware/error';
import { CLAUDE_MODEL } from '../src/routes/health';

describe('createApp', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('returns ok with the active Claude model id', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, model: CLAUDE_MODEL });
    });
  });

  describe('unknown routes', () => {
    it('returns 404 JSON for unknown GETs', async () => {
      const res = await request(app).get('/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not Found' });
    });

    it('returns 404 JSON for unknown POSTs', async () => {
      const res = await request(app).post('/does-not-exist').send({ ok: true });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not Found' });
    });
  });

  describe('JSON body parsing', () => {
    it('accepts payloads up to ~20MB', async () => {
      const largeButValid = { data: 'x'.repeat(1024 * 1024) };
      const res = await request(app).post('/does-not-exist').send(largeButValid);
      expect(res.status).toBe(404);
    });
  });
});

describe('notFoundHandler', () => {
  it('always responds 404 with the same shape', async () => {
    const app = express();
    app.use(notFoundHandler);
    const res = await request(app).get('/anything');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not Found' });
  });
});

describe('errorHandler', () => {
  it('formats ZodError as 400 with flattened details', async () => {
    const app = express();
    app.get('/zod', (_req, _res, next) => {
      next(
        new ZodError([
          {
            path: ['name'],
            message: 'Required',
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
          },
        ]),
      );
    });
    app.use(errorHandler);

    const res = await request(app).get('/zod');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(res.body.details).toBeDefined();
    expect(res.body.details.fieldErrors).toBeDefined();
  });

  it('formats a generic Error as 500 with the message', async () => {
    const app = express();
    app.get('/boom', (_req, _res, next) => {
      next(new Error('boom'));
    });
    app.use(errorHandler);

    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'boom' });
  });

  it('formats non-Error throws as a generic 500', async () => {
    const app = express();
    app.get('/string-throw', (_req, _res, next) => {
      next('a bare string');
    });
    app.use(errorHandler);

    const res = await request(app).get('/string-throw');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal Server Error' });
  });
});
