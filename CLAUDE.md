# CLAUDE.md

This file provides guidance to AI coding agents working in this repository. It was originally created for Claude Code, but the project is now primarily driven by Codex.

## Project

Smart Recipe Planner is an Expo mobile app plus an Express backend. The intended product flow is:

1. User takes or uploads one or more ingredient photos.
2. Backend extracts visible ingredients with a configurable vision provider.
3. Backend generates exactly five structured recipes.
4. User can refresh for five new recipes while sending previously seen recipe IDs as exclusions.
5. User can open a recipe detail screen.

The current architecture notes live in `ARCHITECTURE.md`. The historical implementation plan is at `/Users/edgarpabon/.claude/plans/i-am-working-on-frolicking-wreath.md`; treat it as historical context, not ground truth.

## Current Implementation Status

Implemented:

- npm workspaces: `mobile`, `server`, `shared`.
- Shared Zod schemas for API payloads and recipe/ingredient data.
- Server endpoints:
  - `GET /health`
  - `POST /api/ingredients/extract`
  - `POST /api/recipes/generate`
- Configurable ingredient extraction provider in `server/src/services/ingredientExtraction.ts`, defaulting to Gemini.
- Claude recipe generation integration in `server/src/services/claude.ts`.
- Expo Router mobile scaffold with capture, recipe list, and recipe detail routes.
- Capture screen with camera/library selection, thumbnail grid, image removal, resize/compress/base64 conversion, loading state, and user-facing error messages.
- Mobile API client in `mobile/src/api/client.ts`.
- Persisted recipe store in `mobile/src/store/recipeStore.ts`; only `seenRecipeIds` is persisted to AsyncStorage.
- Recipe list screen that extracts ingredients, generates recipes, refreshes with `excludeRecipeIds`, and stores generated recipes for the detail screen.
- Recipe detail screen that renders the selected recipe from the store and shows an unavailable state when the session no longer holds it.

Not implemented yet:

- CI, Husky hooks, Docker, Railway deployment.

## Commands

Run from repo root unless noted.

Use Node 22 or newer, matching the root `package.json` engine requirement.

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

Workspace commands run with `-w`, for example:

```bash
npm run dev -w server
npm run start -w mobile
npm run test:coverage -w mobile
```

## Architecture

- `mobile/`: Expo SDK 52, Expo Router, React Native, TypeScript. Styling uses `StyleSheet.create` and tokens from `mobile/src/theme/tokens.ts`.
- `server/`: Express + TypeScript. Runtime uses `tsx`; no build step is required yet.
- `shared/`: Zod schemas and inferred types, consumed as the `recipe-planner-shared` workspace package.

Do not introduce cross-workspace path aliases. Import shared contracts by package name (`recipe-planner-shared`) so npm workspace symlinks handle resolution.

## Model Provider Integration

Ingredient image extraction is selected by `INGREDIENT_EXTRACTION_PROVIDER`:

- `gemini` is the default and uses `server/src/services/gemini.ts`.
- `claude` uses the fallback extraction path in `server/src/services/claude.ts`.

All Google GenAI SDK usage belongs in `server/src/services/gemini.ts`. Gemini extraction requires `GEMINI_API_KEY` and defaults to `gemini-2.5-flash`; `GEMINI_INGREDIENT_MODEL` can override that model.

All Anthropic SDK usage belongs in `server/src/services/claude.ts`. Claude remains responsible for recipe generation and for the optional Claude extraction fallback.

Patterns to preserve:

- Provider outputs are always validated with shared Zod schemas.
- Gemini extraction uses structured JSON output, not free-text JSON.
- Claude vision calls send one user message containing N base64 JPEG image blocks plus one trailing text block.
- Claude structured output uses forced tool-use:
  - `tools: [{ name, input_schema }]`
  - `tool_choice: { type: "tool", name }`
  - parse the returned `tool_use.input`
  - validate with the shared Zod schema
- Never parse free-text JSON from model output.
- Unit tests mock `@google/genai` and `@anthropic-ai/sdk` at the module level.

## API Contracts

Server API calls require model-provider keys in `server/.env`:

- `INGREDIENT_EXTRACTION_PROVIDER=gemini` by default.
- `GEMINI_API_KEY` is required for Gemini ingredient extraction.
- `GEMINI_INGREDIENT_MODEL` optionally overrides the default Gemini extraction model.
- `ANTHROPIC_API_KEY` is required for Claude recipe generation and for extraction when `INGREDIENT_EXTRACTION_PROVIDER=claude`.

Mobile API calls require `EXPO_PUBLIC_API_URL` in `mobile/.env.local`. Do not rely on `localhost` for physical-device Expo testing; use a LAN-reachable URL.

`POST /api/ingredients/extract`

```ts
type Request = { images: string[] };
type Response = { ingredients: { name: string; confidence: number }[] };
```

Constraints:

- 1-10 images.
- Each string must be non-empty and no larger than `MAX_IMAGE_B64_LEN`, the base64 length corresponding to 5 MB decoded image data.

`POST /api/recipes/generate`

```ts
type Request = { ingredients: string[]; excludeRecipeIds?: string[] };
type Response = { recipes: Recipe[] };
```

Constraints:

- At least one ingredient.
- Response must contain exactly five recipes.
- Recipe IDs must be unique in the returned batch.

`GET /health`

```ts
type Response = { ok: true; model: string };
```

## Testing

- Coverage threshold is 85% global per workspace.
- Server route tests use `supertest`; in this sandbox, full server tests may require escalated local socket permissions.
- Mobile hook tests use `renderHook` from `@testing-library/react-native`.
- Mock native modules (`expo-image-picker`, `expo-image-manipulator`, `expo-router`) rather than invoking platform behavior.
- Factor native-module logic into hooks under `mobile/src/hooks/` so screens stay declarative.

## UI And Accessibility

- Use `Pressable` for tappable elements.
- Set `accessibilityRole` on buttons/links.
- Give icon-only or ambiguous controls specific `accessibilityLabel` values.
- Keep touch targets at least 44x44 when practical.
- Use safe-area insets via `react-native-safe-area-context`.
- Render explicit empty, loading, and error states.
- Use `fontVariant: ['tabular-nums']` for time/serving counts when those are added.
- Confirm destructive actions with `Alert`.

## Workflow

For every feature change or bug fix:

1. Make a focused implementation with statically typed or inferred types where practical.
2. Check whether docs need updates before pushing. Update README, `ARCHITECTURE.md`, env examples, or agent guidance in the same logical commit when behavior, setup, API contracts, workflow, or architecture changes.
3. Run verification:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run format:check`
   - `npm test`
   - `npm run test:coverage`
4. Have a separate agent review code, tests, and docs impact before pushing.
5. Fix review findings, rerun verification, amend if the commit is still local, and only then push.

The local handoff artifact `codex-handoff.md` is ignored by git. It can be useful context but is stale in places; do not treat it as authoritative.
