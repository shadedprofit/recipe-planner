# Server — Claude Code Context

Loaded automatically when working in `server/`. See root `CLAUDE.md` for
project-wide rules.

## Recipe Data Source

The current recipe data source is model generation cached in SQLite. This is a
demo/MVP tradeoff so generated recipe ids remain resolvable across sessions
without taking on a third-party recipe-provider integration yet.

If the project continues past the demo, commit to a real recipe provider API as
the canonical source of truth. SQLite can remain a local mirror keyed by
provider recipe id, and the model can shift to ranking, adapting, or rewriting
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
