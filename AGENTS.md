# AGENTS.md

This is the Codex guidance file for this repository. Treat it as the repo-level
equivalent of `CLAUDE.md`: it applies to the full tree unless a more specific
`AGENTS.md` is added in a subdirectory.

## Project

Smart Recipe Planner is an Expo mobile app plus an Express backend. The product
flow is:

1. User takes or uploads one or more ingredient photos.
2. Backend extracts visible ingredients with Anthropic Claude vision.
3. Backend generates exactly five structured recipes.
4. User can refresh for five new recipes while sending previously seen recipe
   IDs as exclusions.
5. User can open a recipe detail screen.

Current architecture notes live in `ARCHITECTURE.md`. `README.md` is the
developer quick-start. `CLAUDE.md` remains useful context for Claude Code, but
Codex should prefer this file plus the tracked project docs.

The historical handoff file `codex-handoff.md` may exist locally and is not
authoritative. Do not commit it unless explicitly asked.

## Current Implementation Status

Implemented:

- npm workspaces: `mobile`, `server`, and `shared`.
- Shared Zod schemas for API payloads and recipe/ingredient data.
- Server endpoints:
  - `GET /health`
  - `POST /api/ingredients/extract`
  - `POST /api/recipes/generate`
- Anthropic Claude integration in `server/src/services/claude.ts`.
- Expo Router mobile routes for capture, recipe list, and recipe detail.
- Capture screen with camera/library selection, thumbnail grid, image removal,
  resize/compress/base64 conversion, loading state, and user-facing errors.
- Mobile API client in `mobile/src/api/client.ts`.
- Persisted recipe store in `mobile/src/store/recipeStore.ts`; only
  `seenRecipeIds` is persisted to AsyncStorage.
- Recipe list screen that extracts ingredients, generates recipes, refreshes
  with `excludeRecipeIds`, and stores generated recipes for the detail screen.
- Recipe detail screen that renders the selected recipe from the store and shows
  an unavailable state when the session no longer holds it.

Not implemented yet:

- CI, Husky hooks, Docker, Railway deployment.

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

Workspace commands use `-w`, for example:

```bash
npm run dev -w server
npm run start -w mobile
npm run test:coverage -w mobile
```

## Architecture Rules

- `mobile/`: Expo SDK 52, Expo Router, React Native, TypeScript.
- Mobile request orchestration uses TanStack Query. Mobile recipe state uses
  Zustand, with AsyncStorage persistence limited to seen recipe history.
- `server/`: Express + TypeScript. Runtime uses `tsx`; no build step is
  required yet.
- `shared/`: Zod schemas and inferred types, consumed as the
  `recipe-planner-shared` workspace package.
- Do not introduce cross-workspace path aliases. Import shared contracts by
  package name (`recipe-planner-shared`) so npm workspace symlinks handle
  resolution.
- Keep model API keys server-side only.
- Do not rename files or symbols just to replace "Claude" branding; Claude is
  the model provider and `server/src/services/claude.ts` is intentionally named.

## Anthropic Integration

All Anthropic SDK usage belongs in `server/src/services/claude.ts`.

Patterns to preserve:

- Vision calls send one user message containing N base64 JPEG image blocks plus
  one trailing text block.
- Structured output uses forced tool-use:
  - `tools: [{ name, input_schema }]`
  - `tool_choice: { type: "tool", name }`
  - parse the returned `tool_use.input`
  - validate with the shared Zod schema
- Never parse free-text JSON from model output.
- Unit tests mock `@anthropic-ai/sdk` at the module level.

## API Contracts

Server env lives in `server/.env`. `ANTHROPIC_API_KEY` is required for Claude
calls, and `PORT` is optional.

Mobile API calls require `EXPO_PUBLIC_API_URL` in `mobile/.env.local`. Do not
rely on `localhost` for physical-device Expo testing; use a LAN-reachable URL.

`POST /api/ingredients/extract`

```ts
type Request = { images: string[] };
type Response = { ingredients: { name: string; confidence: number }[] };
```

Constraints:

- 1-10 images.
- Each string must be non-empty and no larger than `MAX_IMAGE_B64_LEN`, the
  base64 length corresponding to 5 MB decoded image data.

`POST /api/recipes/generate`

```ts
type Request = { ingredients: string[]; excludeRecipeIds?: string[] };
type Response = { recipes: Recipe[] };
```

Constraints:

- At least one ingredient.
- Response must contain exactly five recipes.
- Recipe IDs must be unique in the returned batch.
- `excludeRecipeIds` is sent to the model as an exclusion prompt; current schema
  validation does not independently enforce that excluded IDs are absent from
  the response.

`GET /health`

```ts
type Response = { ok: true; model: string };
```

## Coding Standards

- Prefer statically typed or inferred TypeScript over `any`.
- Use shared Zod schemas for API boundary validation.
- Keep changes scoped to the relevant workspace and avoid unrelated refactors.
- Prefer existing local patterns over new abstractions.
- Use `StyleSheet.create` and `mobile/src/theme/tokens.ts` for mobile styling.
- Push native-module behavior into hooks under `mobile/src/hooks/` so screens
  remain declarative and testable.
- Use `Pressable` for tappable mobile elements.
- Set `accessibilityRole` on buttons/links and `accessibilityLabel` on ambiguous
  controls.
- Keep practical touch targets at least 44x44.
- Use safe-area insets via `react-native-safe-area-context`.
- Render explicit empty, loading, and error states.
- Confirm destructive actions with `Alert`.

## Testing

- Coverage threshold is 85% global per workspace.
- Server route tests use `supertest`; in this sandbox, full server tests may
  require escalated local socket permissions.
- Mobile hook tests use `renderHook` from `@testing-library/react-native`.
- Mock native modules (`expo-image-picker`, `expo-image-manipulator`,
  `expo-router`) rather than invoking platform behavior.
- Add or update focused tests when behavior changes.

## Documentation Policy

Docs are part of the development workflow. Update docs in the same logical
commit when a change affects:

- Setup or commands.
- Environment variables.
- API contracts.
- Data flow or architecture.
- User-facing behavior.
- Testing, review, or deployment workflow.

## Workflow

For every feature change, bug fix, or docs change intended for push:

1. Make a focused implementation with typed code where practical.
2. Check whether docs need updates before pushing.
3. Run verification:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run format:check`
   - `npm test`
   - `npm run test:coverage`
4. Have a separate agent review code, tests, and docs impact before pushing.
5. Fix review findings, rerun verification, amend if the commit is still local,
   and only then push.

When committing, do not include unrelated local files. In particular, leave
`codex-handoff.md` untracked unless the user explicitly asks to commit it.
