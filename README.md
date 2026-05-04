# Smart Recipe Planner

Take or upload photos of ingredients, extract what is visible with Claude vision, and generate five structured recipes. Refreshing should produce new recipes without repeating IDs already seen in the session.

A take-home assignment for a Forward Deployed Engineering role at Tenex.

## Current Status

Implemented:

- Monorepo scaffold with `mobile`, `server`, and `shared` npm workspaces.
- Shared Zod schemas for ingredients, recipe data, request/response payloads, image size limits, and unique recipe IDs.
- Express backend with health, ingredient extraction, and recipe generation endpoints.
- Anthropic Claude integration with forced tool-use structured output.
- Expo Router mobile scaffold with a capture screen for camera/library image selection, thumbnail removal, resizing, and base64 conversion.
- Unit tests and coverage gates for implemented server, shared, and mobile hook behavior.

Not implemented yet:

- Mobile API client and persisted recipe store.
- Ingredient extraction flow from selected photos into generated recipes.
- Recipe list refresh and dedup UI.
- Recipe detail rendering from stored recipes. The route exists, but it is still a placeholder.
- CI, Husky hooks, Docker, and Railway deployment wiring.

## Stack

- **Mobile**: Expo SDK 52, TypeScript, Expo Router, React Native, `expo-image-picker`, `expo-image-manipulator`
- **Planned mobile state**: Zustand + AsyncStorage for persisted client state, TanStack Query for server state
- **Backend**: Node + Express (TypeScript), Anthropic Claude Sonnet 4.6, structured output via tool-use
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

- `server/.env` — `ANTHROPIC_API_KEY`, `PORT` (gitignored; `.env.example` committed)
- `mobile/.env.local` — `EXPO_PUBLIC_API_URL` (gitignored; `.env.example` committed)

`EXPO_PUBLIC_*` vars are bundled into the mobile JS — secrets stay server-side.

## API Summary

- `GET /health` returns `{ ok: true, model: string }`.
- `POST /api/ingredients/extract` accepts `{ images: string[] }`, where each image is a base64 JPEG string and the request contains 1-10 images.
- `POST /api/recipes/generate` accepts `{ ingredients: string[]; excludeRecipeIds?: string[] }` and returns exactly five recipes.

The backend validates request and model output with shared Zod schemas. Model responses are accepted only from Claude tool-use blocks, not free-text JSON.

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
