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
- Configurable recipe generation, defaulting to Gemini with Claude as an optional provider.
- Structured model output and Zod validation for provider responses.
- Mobile capture screen that can select camera/library images, resize/compress them, keep base64 data ready for upload, and adapt from phone layouts to wider web/tablet layouts.
- Mobile API client for extraction and generation endpoints.
- Mobile recipe store that keeps selected images, detected ingredients, generated recipes, and persisted seen recipe IDs.
- Mobile recipe list screen that extracts ingredients, generates exactly five recipes, refreshes with dedup support, stores the latest recipes, and presents a responsive ingredient context rail on wide screens.
- Mobile recipe detail screen that reads the selected recipe from the store, falls back to fetching it from the server by id, and renders title, description, time, servings, tags, ingredients, and steps in a responsive detail layout. Shows loading, error, and unavailable states.
- Server-side SQLite recipe persistence: every generated recipe is upserted into a `recipes` table keyed by id, so recipe ids stay resolvable across sessions and devices.
- `GET /api/recipes/:id` endpoint that reads from the SQLite store.
- Expo Web export and static hosting configuration for a public frontend link.
- Full-stack Docker Compose demo setup and generated demo ingredient images.
- Husky hooks: `pre-commit` runs lint, and `pre-push` runs unit tests across all workspaces before pushing.

Still planned:

- CI and live Railway deployment wiring.

## Recipe Data Source

For the demo / MVP the recipe data source is **model generation cached in SQLite**:

- `POST /api/recipes/generate` calls the configured recipe generation provider, validates the response, and persists each recipe with `INSERT OR IGNORE` into `server/data/recipes.db`.
- `GET /api/recipes/:id` serves persisted recipes by id, so a recipe id minted in one session remains resolvable later (mobile detail screen, future sharing, etc.).
- `excludeRecipeIds` is still passed prompt-side as a soft hint for batch deduplication.

This is intentionally a "cache the model output, treat it as our dataset" approach. It is fast to ship, requires no third-party data licensing, and avoids fabricating a detail page when the in-memory store is empty. That makes it a good demo/MVP choice, but it is not the long-term product bet.

### Future work: real recipe API

If this project continues past the demo, the recommended next step is to commit to a real recipe provider API as the source of truth and demote the LLM to a ranker/adapter. Concretely:

- Use a service such as Spoonacular or Edamam (find-by-ingredients endpoint) to retrieve real, attributed recipes with images, nutrition, and source URLs.
- Keep the SQLite cache as a local mirror keyed by the provider's recipe id.
- Optionally use Claude to score / rerank / rewrite the top results into a five-recipe batch, instead of generating recipes from scratch.

This was deferred because it adds API quotas, licensing terms, and an ingredient-taxonomy mapping problem that are not justified by a demo build.

## Data Flow

Current recipe generation flow:

1. Mobile captures or selects images.
2. `useImageSelection` resizes each image to width 1024, compresses JPEG output at `0.7`, and stores `{ uri, base64 }` in component state.
3. Mobile sends base64 JPEG strings to `POST /api/ingredients/extract`.
4. Server validates payloads with `ExtractIngredientsRequestSchema`.
5. Server dispatches image extraction through `server/src/services/ingredientExtraction.ts`.
6. The default Gemini provider sends all image blocks in one structured-output request; the Claude fallback sends all image blocks in one user message and forces the `extract_ingredients` tool.
7. Server validates the provider response with `ExtractIngredientsResponseSchema`.
8. Mobile sends ingredient names plus `excludeRecipeIds` to `POST /api/recipes/generate`. Refreshes reuse the already detected ingredient list for the selected photos, so they do not re-run image extraction unless no ingredients have been detected yet.
9. Server calls the configured recipe generation provider and validates exactly five recipes with unique IDs.
10. Mobile appends returned recipe IDs to persisted `seenRecipeIds`.
11. Server upserts each generated recipe into the SQLite `recipes` table.
12. User taps a recipe; detail screen first reads from the in-memory store and, on a miss, fetches `GET /api/recipes/:id` so cold-start navigation still resolves to a real recipe.

Recipes are still cleared from in-memory state when the session resets, but the SQLite cache means a known recipe id always resolves to a real payload rather than a fabricated one. If the recipe id is genuinely unknown to the server (e.g. wiped DB), the detail screen renders an explicit unavailable state.

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
- `GET /api/recipes/:id`

`server/src/db/database.ts` opens a single SQLite database lazily via `better-sqlite3` and applies the schema. The DB path is taken from `RECIPE_DB_PATH` (default `./data/recipes.db`, resolved against the server CWD). Tests override the path to `:memory:` so they never touch the filesystem.

`server/src/services/recipeStore.ts` owns recipe persistence: `saveRecipes` upserts via `INSERT OR IGNORE` so re-generating a known id is idempotent, and `getRecipeById` validates the JSON payload through `RecipeSchema` before returning.

`server/src/services/ingredientExtraction.ts` selects the image extraction provider from `INGREDIENT_EXTRACTION_PROVIDER`, defaulting to `gemini`.

`server/src/services/gemini.ts` is the only file that imports `@google/genai`. It uses `GEMINI_API_KEY`, defaults ingredient extraction to `gemini-2.5-flash` and recipe generation to `gemini-2.5-flash-lite`, and validates structured JSON output with shared Zod schemas.

`server/src/services/recipeGeneration.ts` selects the recipe generation provider from `RECIPE_GENERATION_PROVIDER`, defaulting to `gemini`.

Gemini extraction and recipe generation requests use structured JSON output. If
Gemini returns a transient availability error such as `UNAVAILABLE`, the server
retries before surfacing the error. Recipe generation uses an 8192-token limit
and also retries malformed JSON or schema-invalid recipe payloads with lower
temperature and stricter "complete JSON only" instructions.

Gemini quota failures such as `RESOURCE_EXHAUSTED` are not retried. The server
normalizes them into a `429 PROVIDER_QUOTA_EXCEEDED` response so the mobile app
can show a concise quota message instead of raw provider JSON.

`server/src/services/claude.ts` is the only file that imports `@anthropic-ai/sdk`. Claude supports optional recipe generation and legacy image extraction when configured.

Claude integration rules:

- Use forced tool-use for Claude structured output.
- Convert Zod schemas to JSON Schema with `zod-to-json-schema`.
- Parse `tool_use.input` and validate with Zod.
- Do not parse model free text as JSON.
- Keep API keys server-side only.

Server env:

- `INGREDIENT_EXTRACTION_PROVIDER`: `gemini` by default; `claude` is available as a fallback.
- `GEMINI_API_KEY`: required when image extraction or recipe generation uses Gemini.
- `GEMINI_INGREDIENT_MODEL`: optional override for the Gemini extraction model.
- `GEMINI_RECIPE_MODEL`: optional override for the Gemini recipe model.
- `RECIPE_GENERATION_PROVIDER`: `gemini` by default; `claude` is available when Anthropic API access is funded.
- `ANTHROPIC_API_KEY`: required only for Claude recipe generation or Claude extraction fallback.
- `RECIPE_DB_PATH`: optional override for the SQLite recipe cache path. Defaults to `./data/recipes.db` (created on demand) and accepts `:memory:` for ephemeral runs.

Error handling:

- Zod validation errors return 400 with flattened details.
- Generic errors return 500.
- Production generic error messages are sanitized to `Internal Server Error`.

## Mobile

The mobile app uses Expo Router:

- `mobile/app/index.tsx`: capture screen, implemented.
- `mobile/app/recipes.tsx`: recipe generation and list screen, implemented.
- `mobile/app/recipes/[id].tsx`: recipe detail screen, implemented.

The mobile UI uses `mobile/src/theme/tokens.ts` for shared color, spacing,
radius, layout, and shadow tokens. Wide-screen behavior is centralized in
`mobile/src/hooks/useResponsiveLayout.ts`, and icon controls use
`lucide-react-native` backed by `react-native-svg`.

### UI Design Direction

The app should feel like a production kitchen utility rather than a demo or
marketing page. Keep the UI warm, practical, and food-aware, with clear task
hierarchy and restrained visual polish. Ingredient photos are the visual source
of truth; do not invent recipe imagery until a real recipe provider supplies
canonical images. Phone layouts should stay efficient for the capture-to-recipe
flow, while tablet and Expo Web layouts should use intentional max widths, side
context, grids, and readable detail panes instead of stretched mobile columns.

The capture screen delegates native image work to `mobile/src/hooks/useImageSelection.ts`.

Current capture behavior:

- Requests camera or photo-library permission.
- Opens camera or image library.
- Supports multiple library image selection up to 10 total images.
- Resizes selected images to width 1024.
- Saves JPEG output with `compress: 0.7` and `base64: true`.
- Displays a stable thumbnail grid that adapts column count on larger screens.
- Provides accessible remove controls and user-facing error messages.
- Uses a responsive app shell so the photo actions and selected-image grid feel
  intentional on phone, tablet, and Expo Web viewports.
- On Expo Web only: accepts image files dragged from the OS onto the photo
  panel via HTML5 drag-and-drop events. The panel highlights with a green
  border and tinted background while dragging. Logic lives in
  `mobile/src/hooks/useWebDropZone.ts`; mobile native builds are unaffected.

The recipe list screen delegates network calls to `mobile/src/api/client.ts` and state to `mobile/src/store/recipeStore.ts`.

`mobile/src/api/client.ts` requires `EXPO_PUBLIC_API_URL` so the app fails with a clear configuration error instead of silently trying an unreachable `localhost` from a physical device.

Expo Web is built with `npm run build:web -w mobile`, which exports static files
to `mobile/dist`. The recommended public deployment is Vercel for this static
frontend and Railway for the Express backend. The web app needs
`EXPO_PUBLIC_API_URL` at build time because Expo embeds public environment
variables into the client bundle.

Current recipe list behavior:

- Runs initial generation when selected images are available.
- Calls ingredient extraction before recipe generation.
- Sends `seenRecipeIds` as `excludeRecipeIds` for refresh deduplication.
- Stores returned recipes and appends their IDs to history after successful generation.
- Shows selected photos and detected ingredients as context, with a side rail on
  wider screens.
- Shows explicit empty, loading, and error states.
- Confirms destructive history clearing with `Alert`.

## Testing Strategy

Each workspace has an 85% global Jest coverage threshold.

Current coverage focus:

- `shared`: schema invariants.
- `server`: routes, middleware, provider dispatch, Gemini extraction/generation behavior with mocked Google SDK, and Claude behavior with mocked Anthropic SDK.
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
