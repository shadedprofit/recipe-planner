# AGENTS.md

Codex uses this file as the repo-level project instruction entrypoint. Keep it
short enough to load reliably and treat `README.md` plus `ARCHITECTURE.md` as
the product and architecture source of truth.

## Project

Smart Recipe Planner is an Expo mobile app plus an Express backend:

1. User takes or uploads one or more ingredient photos.
2. Backend extracts visible ingredients with a configurable vision provider.
3. Backend generates exactly five structured recipes.
4. User can refresh for five new recipes while sending previously seen recipe
   IDs as exclusions.
5. User can open a recipe detail screen.

## AI Docs Layout

- `AGENTS.md`: Codex entrypoint and repo-level working rules.
- `CLAUDE.md`: Claude Code entrypoint with the same high-level project rules.
- `.codex/`: optional Codex support docs, templates, or skill notes. Codex does
  not treat this as a replacement for `AGENTS.md`.
- `.claude/`: Claude Code native project extensions such as subagents, commands,
  and shared settings.
- `README.md`: developer quick-start and current implementation summary.
- `ARCHITECTURE.md`: current design, data flow, API contracts, and rationale.

Do not move critical instructions out of `AGENTS.md` unless this file links to
them clearly and they are safe to load on demand.

## Current Implementation

Implemented:

- npm workspaces: `mobile`, `server`, and `shared`.
- Server endpoints: `GET /health`, `POST /api/ingredients/extract`,
  `POST /api/recipes/generate`, and `GET /api/recipes/:id`.
- Configurable ingredient extraction provider, defaulting to Gemini.
- Configurable recipe generation provider, defaulting to Gemini.
- SQLite-backed recipe cache via `better-sqlite3`; generated recipes are stored
  by id and used by the detail endpoint.
- Expo Web export for static frontend deployment.
- Demo guide, generated demo ingredient images, and full-stack Docker Compose.
- Vercel frontend deployment config.
- Expo Router mobile capture, recipe list, and recipe detail flows.
- Zustand mobile recipe store; only `seenRecipeIds` persists to AsyncStorage.
- Husky hooks: `pre-commit` runs lint, and `pre-push` runs unit tests.

Still planned: CI and live Railway deployment.

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
npm run web -w mobile
npm run build:web -w mobile
npm run demo
npm run test:coverage -w mobile
```

## Architecture Rules

- `mobile/`: Expo SDK 52, Expo Router, React Native, TypeScript.
- `server/`: Express + TypeScript. Runtime uses `tsx`; no build step is
  required yet.
- `shared/`: Zod schemas and inferred types consumed as
  `recipe-planner-shared`.
- Import shared contracts by package name, not cross-workspace relative paths.
- Keep model API keys server-side only.
- Do not rename files or symbols just to replace "Claude" branding;
  `server/src/services/claude.ts` is intentionally named.
- Use shared Zod schemas for API boundary validation.
- Prefer local patterns and scoped changes over new abstractions.

## Recipe Data Source

The current recipe data source is model generation cached in SQLite. This is a
demo/MVP tradeoff: generated recipe ids remain resolvable across sessions
without committing to a third-party recipe-provider integration yet.

Longer term, the app should commit to a real recipe provider API as the
canonical source. SQLite can remain a local mirror keyed by provider recipe id,
and Claude can shift to ranking, adapting, or rewriting provider results.

## Provider Rules

- Ingredient extraction is selected by `INGREDIENT_EXTRACTION_PROVIDER`.
- Gemini extraction belongs in `server/src/services/gemini.ts`, requires
  `GEMINI_API_KEY`, and defaults to `gemini-2.5-flash`.
- Claude generation and fallback extraction belong in
  `server/src/services/claude.ts`.
- Recipe generation dispatch belongs in `server/src/services/recipeGeneration.ts`.
- Provider outputs are always validated with shared Zod schemas.
- Gemini providers use structured JSON output.
- Claude structured output uses forced tool-use:
  - `tools: [{ name, input_schema }]`
  - `tool_choice: { type: "tool", name }`
  - parse `tool_use.input`
  - validate with shared Zod schemas
- Never parse free-text JSON from model output.
- Unit tests mock `@google/genai` and `@anthropic-ai/sdk` at the module level.

## API Notes

Server env lives in `server/.env`:

- `INGREDIENT_EXTRACTION_PROVIDER=gemini` by default.
- `GEMINI_API_KEY` is required for Gemini ingredient extraction.
- `GEMINI_INGREDIENT_MODEL` optionally overrides the Gemini extraction model.
- `GEMINI_RECIPE_MODEL` optionally overrides the Gemini recipe model.
- `RECIPE_GENERATION_PROVIDER` defaults to `gemini`; use `claude` only when
  Anthropic API access is funded.
- `ANTHROPIC_API_KEY` is required only for Claude recipe generation or Claude
  extraction fallback.
- `RECIPE_DB_PATH` optionally overrides the SQLite recipe cache path. It
  defaults to `./data/recipes.db`; tests can use `:memory:`.
- `PORT` is optional.

Mobile and web API calls require `EXPO_PUBLIC_API_URL`. Use
`mobile/.env.local` for local Expo runs and Vercel project env vars for deployed
web builds. Do not rely on `localhost` for physical-device Expo testing; use a
LAN-reachable URL.

## Mobile Rules

- Use `StyleSheet.create` and `mobile/src/theme/tokens.ts` for styling.
- Push native-module behavior into hooks under `mobile/src/hooks/`.
- Use `Pressable` for tappable mobile elements.
- Set `accessibilityRole` on buttons/links and `accessibilityLabel` on
  ambiguous controls.
- Keep practical touch targets at least 44x44.
- Use safe-area insets via `react-native-safe-area-context`.
- Render explicit empty, loading, and error states.
- Confirm destructive actions with `Alert`.

## Testing And Workflow

- Coverage threshold is 85% global per workspace.
- Server route tests use `supertest`; in this sandbox, full server tests may
  require escalated local socket permissions.
- Mobile hook tests use `renderHook` from `@testing-library/react-native`.
- Mock native modules rather than invoking platform behavior.
- Add or update focused tests when behavior changes.
- Update docs in the same logical commit when setup, env vars, API contracts,
  data flow, architecture, user-facing behavior, testing, or deployment changes.
- Before pushing, run lint, typecheck, format check, tests, and coverage.
- Have an independent review pass check code, tests, and docs impact before
  pushing.

When committing, do not include unrelated local files. In particular, leave
`codex-handoff.md` ignored unless the user explicitly asks to commit it.
