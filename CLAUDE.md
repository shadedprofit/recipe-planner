# CLAUDE.md

This is the Claude Code memory entrypoint for this repository. Keep it aligned
with `AGENTS.md`, but use `.claude/` for Claude-native project extensions.

## Project

Smart Recipe Planner is an Expo mobile app plus an Express backend. The product
flow is:

1. User takes or uploads one or more ingredient photos.
2. Backend extracts visible ingredients with a configurable vision provider.
3. Backend generates exactly five structured recipes.
4. User can refresh for five new recipes while sending previously seen recipe
   IDs as exclusions.
5. User can open a recipe detail screen.

Use `README.md` for quick-start instructions and `docs/ARCHITECTURE.md` for
design, data flow, and API details.

## AI Docs Layout

- `CLAUDE.md`: Claude Code entrypoint and project memory.
- `server/CLAUDE.md`: server provider rules, environment variables, and recipe
  data source notes — auto-loaded when working in `server/`.
- `mobile/CLAUDE.md`: mobile styling, hooks patterns, accessibility, and
  platform-specific rules — auto-loaded when working in `mobile/`.
- `.claude/agents/`: project subagents — create if you need a reusable
  Claude persona scoped to this repo (Markdown + YAML frontmatter).
- `.claude/commands/`: project slash commands — create if you add custom
  commands like `/deploy` or `/gen-demo-images`.
- `.claude/settings.json`: shared project settings — create if needed.
- `AGENTS.md`: Codex entrypoint.
- `.codex/`: optional Codex support docs or skill notes; not a replacement for
  `AGENTS.md`.

## Current Implementation

Implemented:

- npm workspaces: `mobile`, `server`, and `shared`.
- Server endpoints: `GET /health`, `POST /api/ingredients/extract`,
  `POST /api/recipes/generate`, and `GET /api/recipes/:id`.
- Configurable ingredient extraction provider, defaulting to Gemini.
- Configurable recipe generation provider, defaulting to Gemini.
- SQLite-backed recipe cache via `better-sqlite3`.
- Expo Web export for static frontend deployment.
- Demo guide, generated demo ingredient images, and full-stack Docker Compose.
- Vercel frontend deployment config.
- Expo Router capture, recipe list, and recipe detail flows.
- Mobile recipe detail falls back to server fetch by id on cold start.
- Husky hooks: `pre-commit` runs lint, and `pre-push` runs unit tests.
- GitHub Actions CI on every push/PR; dev frontend deployed to GitHub Pages
  and backend deployed to Railway on push to `main`. See `docs/DEPLOYMENT.md`
  for required secrets (`DEV_API_URL`, `RAILWAY_TOKEN`, `RAILWAY_SERVICE`).

## Commands

Run from the repo root unless noted. Use Node 22 or newer.

```bash
npm install
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck
npm test
npm run test:coverage
```

Workspace examples:

```bash
npm run dev -w server
npm run start -w mobile
npm run web -w mobile
npm run build:web -w mobile
npm run demo
npm run demo:down
npm run test:coverage -w mobile
```

## Architecture Rules

- `mobile/`: Expo SDK 52, Expo Router, React Native, TypeScript.
- `server/`: Express + TypeScript. Runtime uses `tsx`; no build step is
  required yet.
- `shared/`: Zod schemas and inferred types consumed as
  `recipe-planner-shared`.
- Import shared contracts by package name.
- Keep model API keys server-side only.
- Do not rename files or symbols just to replace "Claude" branding.
- Use shared Zod schemas for API boundary validation.
- Keep changes scoped and follow local patterns.

## Workflow

For every feature change or bug fix:

1. Make a focused implementation with statically typed or inferred types.
2. Update docs when behavior, setup, API contracts, env vars, workflow, or
   architecture changes.
3. Run verification:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run format:check`
   - `npm test`
   - `npm run test:coverage`
4. Have a separate review pass check code, tests, and docs impact before
   pushing.
5. Fix review findings and rerun verification.

The local handoff artifact `codex-handoff.md` is ignored by git and is not
authoritative.
