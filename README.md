# Smart Recipe Planner

Take or upload photos of ingredients, extract what is visible with a configurable vision model, and generate five structured recipes. Refreshing sends previously seen recipe IDs as exclusions.

## Current Status

Implemented:

- Monorepo scaffold with `mobile`, `server`, and `shared` npm workspaces.
- Shared Zod schemas for ingredients, recipe data, request/response payloads, image size limits, and unique recipe IDs.
- Express backend with health, ingredient extraction, and recipe generation endpoints.
- Configurable ingredient image extraction, defaulting to Gemini with Claude as a fallback provider.
- Configurable recipe generation, defaulting to Gemini with Claude as an optional provider.
- Expo Router mobile scaffold with a capture screen for camera/library image selection, thumbnail removal, resizing, and base64 conversion. The web build uses browser camera capture for the Camera button.
- Mobile API client for extraction/generation requests.
- Mobile recipe store for selected images, detected ingredients, generated recipes, and seen recipe IDs. Only seen recipe IDs are persisted to AsyncStorage.
- Recipe list screen that extracts ingredients from selected photos, generates recipes, refreshes with dedup support, and links to recipe details.
- Recipe detail screen that renders the selected recipe (title, description, time, servings, tags, ingredients, steps), falls back to fetching by id from the server on cold start, and renders explicit loading/error/unavailable states.
- SQLite-backed recipe cache (`better-sqlite3`) so generated recipe ids resolve across sessions via `GET /api/recipes/:id`.
- Expo Web export for deploying the app to a public link.
- Demo guide, generated demo ingredient images, and full-stack Docker Compose setup.
- Vercel frontend deployment config.
- Husky hooks: `pre-commit` runs lint, and `pre-push` runs all workspace unit tests before a push.
- Unit tests and coverage gates for implemented server, shared, mobile hook, API client, store, and recipe screen behavior.

Not implemented yet:

- CI and live Railway deployment wiring.

## Stack

- **Mobile**: Expo SDK 52, TypeScript, Expo Router, React Native, `expo-image-picker`, `expo-image-manipulator`
- **Mobile state**: Zustand + AsyncStorage for seen recipe history, TanStack Query for request orchestration
- **Backend**: Node + Express (TypeScript), Gemini image extraction and recipe generation by default, optional Claude fallback providers, structured model output, SQLite recipe cache via `better-sqlite3`
- **Shared**: Zod schemas consumed by both apps
- **Planned hosting**: Vercel Expo Web frontend plus Railway backend with a persistent SQLite volume

## Repo Layout

```
mobile/   Expo app
server/   Express backend
shared/   Zod schemas + types
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the current design rationale, API contract, and implementation status.
See [DEMO.md](docs/DEMO.md) for a local demo walkthrough with generated sample images and Docker startup.
See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for the recommended Vercel + Railway deployment path.

## AI Agent Docs

- `AGENTS.md` is the Codex entrypoint.
- `CLAUDE.md` is the Claude Code entrypoint.
- `.claude/` is reserved for Claude Code-native project extensions such as
  subagents, commands, and shared settings.
- `.codex/` is reserved for optional Codex support docs or skill notes; critical
  Codex instructions stay in `AGENTS.md`.

## Quick Start

Use Node 22 or newer, matching the root `package.json` engine requirement.

```bash
npm install
npm run lint
npm run typecheck
npm run format:check
npm test
npm run test:coverage
```

Run a workspace command with `-w`, for example:

```bash
npm run dev -w server
npm run start -w mobile
npm run web -w mobile
npm run build:web -w mobile
npm run demo
npm run demo:down
```

## Environment Files

Each workspace owns its own env config:

- `server/.env` — `INGREDIENT_EXTRACTION_PROVIDER`, `RECIPE_GENERATION_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_INGREDIENT_MODEL`, `GEMINI_RECIPE_MODEL`, optional `ANTHROPIC_API_KEY`, `PORT`, optional `RECIPE_DB_PATH` (gitignored; `.env.example` committed)
- `mobile/.env.local` — `EXPO_PUBLIC_API_URL` (gitignored; `.env.example` committed)

`EXPO_PUBLIC_*` vars are bundled into the mobile JS — secrets stay server-side.

Server-side model keys stay in `server/.env`:

- `INGREDIENT_EXTRACTION_PROVIDER=gemini` uses Gemini for image extraction.
- `RECIPE_GENERATION_PROVIDER=gemini` uses Gemini for recipe generation.
- `GEMINI_API_KEY` is required for Gemini extraction and Gemini recipe generation.
- `GEMINI_INGREDIENT_MODEL` optionally overrides the default `gemini-2.5-flash` extraction model.
- `GEMINI_RECIPE_MODEL` optionally overrides the default `gemini-2.5-flash` recipe model.
- `ANTHROPIC_API_KEY` is only required when `RECIPE_GENERATION_PROVIDER=claude` or `INGREDIENT_EXTRACTION_PROVIDER=claude`.

The server entrypoint loads `server/.env` automatically for local
`npm run dev -w server` and `npm run start -w server` runs. Docker Compose also
reads the same file through `npm run demo`, `npm run demo:server`, and
`npm run demo:down`.

`EXPO_PUBLIC_API_URL` must be reachable from the client runtime:

- iOS simulator: `http://localhost:3001`
- Android emulator: `http://10.0.2.2:3001`
- Physical device: `http://<your-computer-lan-ip>:3001`
- Local Docker web demo: `http://localhost:3001`
- Vercel web deployment: the public Railway backend URL

## API Summary

- `GET /health` returns `{ ok: true, model: string }`.
- `POST /api/ingredients/extract` accepts `{ images: string[] }`, where each image is a base64 JPEG string and the request contains 1-10 images.
- `POST /api/recipes/generate` accepts `{ ingredients: string[]; excludeRecipeIds?: string[] }` and returns exactly five recipes. Each generated recipe is upserted into the SQLite recipe cache.
- `GET /api/recipes/:id` returns `{ recipe }` from the cache, or 404 when the id is unknown.

The backend validates request and model output with shared Zod schemas. Gemini providers use structured JSON output; Claude providers use forced tool-use blocks rather than free-text JSON.

For demo/MVP purposes, the recipe data source is model generation cached in SQLite: the app treats generated recipe payloads as a local cache keyed by recipe id so detail screens and future share links can resolve without inventing content. This is a deliberate demo tradeoff, not the intended long-term source of truth. If this project continues past the demo, the planned next step is to commit to a real recipe provider API (for example Spoonacular or Edamam) as the canonical source and demote the LLM to a ranker/adapter. See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Development Workflow

For each feature or bug fix:

1. Keep changes typed and scoped to the relevant workspace.
2. Update docs in the same logical commit when behavior, setup, API contracts, environment variables, architecture, or workflow changes.
3. Run lint, typecheck, format check, and tests before pushing. Husky also runs `npm run lint` from `.husky/pre-commit` and `npm test` from `.husky/pre-push`.
4. Run coverage before pushing because each workspace has an 85% global threshold.
5. Have an independent review pass check code, tests, and docs impact before pushing.

Useful verification commands:

```bash
npm run lint
npm run typecheck
npm run format:check
npm test
npm run test:coverage
```
