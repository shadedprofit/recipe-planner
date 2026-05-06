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

Use `README.md` for quick-start instructions and `ARCHITECTURE.md` for design,
data flow, and API details.

## AI Docs Layout

- `CLAUDE.md`: Claude Code entrypoint and project memory.
- `.claude/agents/`: Claude Code project subagents. Subagent files use Markdown
  with YAML frontmatter (`name`, `description`, optional `tools`).
- `.claude/commands/`: optional project slash commands.
- `.claude/settings.json`: optional shared Claude Code settings.
- `.claude/settings.local.json`: personal Claude settings; keep it untracked.
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

## Recipe Data Source

The current recipe data source is model generation cached in SQLite. This is a
demo/MVP tradeoff so generated recipe ids remain resolvable across sessions
without taking on a third-party recipe-provider integration yet.

If the project continues past the demo, commit to a real recipe provider API as
the canonical source of truth. SQLite can remain a local mirror keyed by
provider recipe id, and Claude can shift to ranking, adapting, or rewriting
provider results instead of inventing recipes from scratch.

## Model Provider Rules

- Ingredient extraction is selected by `INGREDIENT_EXTRACTION_PROVIDER`.
- Gemini extraction belongs in `server/src/services/gemini.ts`.
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

## Environment

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
web builds. Use a LAN-reachable URL for physical-device Expo testing.

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
