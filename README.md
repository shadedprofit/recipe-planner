# Smart Recipe Planner

Take or upload photos of ingredients, extract what is visible with a configurable vision model, and generate five structured recipes. Refreshing sends previously seen recipe IDs as exclusions.

## Current Status

Implemented:

- Monorepo scaffold with `mobile`, `server`, and `shared` npm workspaces.
- Shared Zod schemas for ingredients, recipe data, request/response payloads, image size limits, and unique recipe IDs.
- Express backend with health, ingredient extraction, and recipe generation endpoints.
- Configurable ingredient image extraction, defaulting to Gemini with Claude as a fallback provider.
- Anthropic Claude recipe generation with forced tool-use structured output.
- Expo Router mobile scaffold with a capture screen for camera/library image selection, thumbnail removal, resizing, and base64 conversion.
- Mobile API client for extraction/generation requests.
- Mobile recipe store for selected images, detected ingredients, generated recipes, and seen recipe IDs. Only seen recipe IDs are persisted to AsyncStorage.
- Recipe list screen that extracts ingredients from selected photos, generates recipes, refreshes with dedup support, and links to recipe details.
- Recipe detail screen that renders the selected recipe (title, description, time, servings, tags, ingredients, steps) and shows an unavailable state when the session no longer holds it.
- Unit tests and coverage gates for implemented server, shared, mobile hook, API client, store, and recipe screen behavior.

Not implemented yet:

- CI, Husky hooks, Docker, and Railway deployment wiring.

## Stack

- **Mobile**: Expo SDK 52, TypeScript, Expo Router, React Native, `expo-image-picker`, `expo-image-manipulator`
- **Mobile state**: Zustand + AsyncStorage for seen recipe history, TanStack Query for request orchestration
- **Backend**: Node + Express (TypeScript), Gemini image extraction by default, Anthropic Claude Sonnet 4.6 recipe generation, structured model output
- **Shared**: Zod schemas consumed by both apps
- **Planned hosting**: Railway backend and Expo Go mobile demo

## Repo Layout

```
mobile/   Expo app
server/   Express backend
shared/   Zod schemas + types
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the current design rationale, API contract, and implementation status.

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
```

## Environment Files

Each workspace owns its own env config:

- `server/.env` — `INGREDIENT_EXTRACTION_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_INGREDIENT_MODEL`, `ANTHROPIC_API_KEY`, `PORT` (gitignored; `.env.example` committed)
- `mobile/.env.local` — `EXPO_PUBLIC_API_URL` (gitignored; `.env.example` committed)

`EXPO_PUBLIC_*` vars are bundled into the mobile JS — secrets stay server-side.

Server-side model keys stay in `server/.env`:

- `INGREDIENT_EXTRACTION_PROVIDER=gemini` uses Gemini for image extraction.
- `GEMINI_API_KEY` is required for Gemini extraction.
- `GEMINI_INGREDIENT_MODEL` optionally overrides the default `gemini-2.5-flash` extraction model.
- `ANTHROPIC_API_KEY` is required for Claude recipe generation and for extraction when `INGREDIENT_EXTRACTION_PROVIDER=claude`.

`EXPO_PUBLIC_API_URL` must be reachable from the mobile runtime:

- iOS simulator: `http://localhost:3001`
- Android emulator: `http://10.0.2.2:3001`
- Physical device: `http://<your-computer-lan-ip>:3001`

## API Summary

- `GET /health` returns `{ ok: true, model: string }`.
- `POST /api/ingredients/extract` accepts `{ images: string[] }`, where each image is a base64 JPEG string and the request contains 1-10 images.
- `POST /api/recipes/generate` accepts `{ ingredients: string[]; excludeRecipeIds?: string[] }` and returns exactly five recipes.

The backend validates request and model output with shared Zod schemas. Gemini extraction uses structured JSON output; Claude recipe generation uses forced tool-use blocks rather than free-text JSON.

## Development Workflow

For each feature or bug fix:

1. Keep changes typed and scoped to the relevant workspace.
2. Update docs in the same logical commit when behavior, setup, API contracts, environment variables, architecture, or workflow changes.
3. Run lint, typecheck, format check, and tests before pushing.
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
