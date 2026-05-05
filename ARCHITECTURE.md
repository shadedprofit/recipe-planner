# Architecture

Smart Recipe Planner is a three-workspace TypeScript app:

- `mobile/`: Expo mobile client.
- `server/`: Express backend that owns all model-provider calls.
- `shared/`: Zod schemas and inferred TypeScript types shared by mobile and server.

The design goal is a small, reviewable project with a real backend, no leaked model keys, structured model output, and tests around the important contracts.

## Current State

Implemented:

- Shared schemas for ingredients, recipes, extraction requests/responses, and generation requests/responses.
- Server health, ingredient extraction, and recipe generation routes.
- Configurable ingredient image extraction, defaulting to Gemini with Claude as a fallback provider.
- Claude tool-use recipe generation and Zod validation of model output.
- Mobile capture screen that can select camera/library images, resize/compress them, and keep base64 data ready for upload.
- Mobile API client for extraction and generation endpoints.
- Mobile recipe store that keeps selected images, detected ingredients, generated recipes, and persisted seen recipe IDs.
- Mobile recipe list screen that extracts ingredients, generates exactly five recipes, refreshes with dedup support, and stores the latest recipes.
- Mobile recipe detail screen that reads the selected recipe from the store, renders title, description, time, servings, tags, ingredients, and steps, and shows an unavailable state when the session no longer contains the recipe.

Still planned:

- CI, git hooks, Docker, and deployment.

## Data Flow

Current recipe generation flow:

1. Mobile captures or selects images.
2. `useImageSelection` resizes each image to width 1024, compresses JPEG output at `0.7`, and stores `{ uri, base64 }` in component state.
3. Mobile sends base64 JPEG strings to `POST /api/ingredients/extract`.
4. Server validates payloads with `ExtractIngredientsRequestSchema`.
5. Server dispatches image extraction through `server/src/services/ingredientExtraction.ts`.
6. The default Gemini provider sends all image blocks in one structured-output request; the Claude fallback sends all image blocks in one user message and forces the `extract_ingredients` tool.
7. Server validates the provider response with `ExtractIngredientsResponseSchema`.
8. Mobile sends ingredient names plus `excludeRecipeIds` to `POST /api/recipes/generate`.
9. Server forces the `generate_recipes` Claude tool and validates exactly five recipes with unique IDs.
10. Mobile appends returned recipe IDs to persisted `seenRecipeIds`.
11. User taps a recipe; detail screen reads the recipe from the store by `id` and renders the full details.

Recipes are kept in memory only for the active session; if the session is cleared, the detail screen shows an unavailable state instead of fabricating data.

## Shared Contracts

Shared contracts live in `shared/src/schemas.ts`.

Important invariants:

- Ingredient names are non-empty.
- Ingredient confidence is a number from 0 to 1.
- Extraction accepts 1-10 base64 image strings.
- Each base64 image string is capped by `MAX_IMAGE_B64_LEN`, corresponding to 5 MB decoded image data.
- Recipe generation requires at least one ingredient.
- Generated recipe responses contain exactly five recipes.
- Recipe IDs must be unique within a returned batch.

Server and mobile should import contracts from `recipe-planner-shared`, not from relative cross-workspace paths.

## Backend

`server/src/app.ts` builds the Express app:

- `GET /health`
- `POST /api/ingredients/extract`
- `POST /api/recipes/generate`

`server/src/services/ingredientExtraction.ts` selects the image extraction provider from `INGREDIENT_EXTRACTION_PROVIDER`, defaulting to `gemini`.

`server/src/services/gemini.ts` is the only file that imports `@google/genai`. It uses `GEMINI_API_KEY`, defaults to `gemini-2.5-flash`, and validates structured JSON output with `ExtractIngredientsResponseSchema`.

`server/src/services/claude.ts` is the only file that imports `@anthropic-ai/sdk`. It remains responsible for recipe generation and also supports the legacy Claude extraction provider.

Claude integration rules:

- Use forced tool-use for Claude structured output.
- Convert Zod schemas to JSON Schema with `zod-to-json-schema`.
- Parse `tool_use.input` and validate with Zod.
- Do not parse model free text as JSON.
- Keep API keys server-side only.

Server env:

- `INGREDIENT_EXTRACTION_PROVIDER`: `gemini` by default; `claude` is available as a fallback.
- `GEMINI_API_KEY`: required when image extraction uses Gemini.
- `GEMINI_INGREDIENT_MODEL`: optional override for the Gemini extraction model.
- `ANTHROPIC_API_KEY`: required for recipe generation and for Claude extraction fallback.

Error handling:

- Zod validation errors return 400 with flattened details.
- Generic errors return 500.
- Production generic error messages are sanitized to `Internal Server Error`.

## Mobile

The mobile app uses Expo Router:

- `mobile/app/index.tsx`: capture screen, implemented.
- `mobile/app/recipes.tsx`: recipe generation and list screen, implemented.
- `mobile/app/recipes/[id].tsx`: recipe detail screen, implemented.

The capture screen delegates native image work to `mobile/src/hooks/useImageSelection.ts`.

Current capture behavior:

- Requests camera or photo-library permission.
- Opens camera or image library.
- Supports multiple library image selection up to 10 total images.
- Resizes selected images to width 1024.
- Saves JPEG output with `compress: 0.7` and `base64: true`.
- Displays a stable 3-column thumbnail grid.
- Provides accessible remove controls and user-facing error messages.

The recipe list screen delegates network calls to `mobile/src/api/client.ts` and state to `mobile/src/store/recipeStore.ts`.

`mobile/src/api/client.ts` requires `EXPO_PUBLIC_API_URL` so the app fails with a clear configuration error instead of silently trying an unreachable `localhost` from a physical device.

Current recipe list behavior:

- Runs initial generation when selected images are available.
- Calls ingredient extraction before recipe generation.
- Sends `seenRecipeIds` as `excludeRecipeIds` for refresh deduplication.
- Stores returned recipes and appends their IDs to history after successful generation.
- Shows explicit empty, loading, and error states.
- Confirms destructive history clearing with `Alert`.

## Testing Strategy

Each workspace has an 85% global Jest coverage threshold.

Current coverage focus:

- `shared`: schema invariants.
- `server`: routes, middleware, provider dispatch, Gemini extraction behavior with mocked Google SDK, and Claude behavior with mocked Anthropic SDK.
- `mobile`: design tokens, `useImageSelection`, API client, recipe store, recipe list screen, and recipe detail screen.

Future mobile work should continue to push native-module behavior into hooks so it can be tested without device APIs.

## Documentation Policy

Docs are part of the development workflow. Update docs in the same logical commit when a change affects:

- Setup or commands.
- Environment variables.
- API contracts.
- Data flow or architecture.
- User-facing behavior.
- Testing, review, or deployment workflow.
