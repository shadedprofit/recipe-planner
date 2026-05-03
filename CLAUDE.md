# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Smart Recipe Planner — Expo mobile app + Express backend that takes photos of ingredients and returns 5 structured recipes via Anthropic Claude (Sonnet 4.6). Take-home assignment for an FDE role at Tenex. The full design rationale lives in `ARCHITECTURE.md` (added in commit 10) and the implementation plan in `/Users/edgarpabon/.claude/plans/i-am-working-on-frolicking-wreath.md`.

## Commands

Run from the repo root unless noted.

```bash
npm install               # installs all workspaces
npm run lint              # eslint across all workspaces
npm run lint:fix          # eslint --fix
npm run format            # prettier --write .
npm run format:check      # prettier --check . (CI uses this)
npm run typecheck         # tsc --noEmit in each workspace (--if-present)
npm test                  # jest in each workspace (--if-present)
npm run test:coverage     # jest --coverage; gate is 85%
```

Per-workspace commands run via `npm run <script> -w <workspace>` (e.g. `npm run dev -w server`). Each workspace owns its own `package.json` scripts.

## Architecture

Three npm workspaces, no Turborepo:

- **`mobile/`** — Expo SDK 52 + Expo Router (file-based, three screens: capture / recipe list / recipe detail). State: Zustand (with `persist` middleware → AsyncStorage) for client state, TanStack Query for server state. Styling: `StyleSheet.create` + design tokens (`mobile/src/theme/tokens.ts`); intentionally **not** NativeWind.
- **`server/`** — Express + TypeScript. Two AI endpoints (`POST /api/ingredients/extract`, `POST /api/recipes/generate`) plus `GET /health` (used to wake Railway from cold start). Run with `tsx` in dev and prod — no build step required.
- **`shared/`** — Zod schemas for `Ingredient`, `Recipe`, request/response shapes. Both workspaces depend on it as `recipe-planner-shared`. Single source of truth: changing a schema breaks both apps at compile time.

### Anthropic integration — the only place that matters

All Claude calls go through `server/src/services/claude.ts`. Two patterns:

1. **Vision (ingredient extraction)**: one `user` message with N image content blocks (base64 JPEGs) + one trailing text block. Mobile resizes via `expo-image-manipulator` to ~300 KB per image before upload.
2. **Forced structured output**: `tool_choice: { type: "tool", name: "<tool_name>" }` with `input_schema` derived from the Zod schema via `zod-to-json-schema`. Parse `response.content.find(c => c.type === "tool_use").input` and validate with the same Zod schema. Never parse free-text JSON.

Tests mock `@anthropic-ai/sdk` at the module level — `claude.ts` is the canonical mock target. Integration tests that hit the real API are gated behind `RUN_INTEGRATION=1`.

### Recipe deduplication

The client persists `seenRecipeIds: string[]` in a Zustand store with `persist` middleware (AsyncStorage adapter). Every refresh sends it as `excludeRecipeIds` in the request body. The backend interpolates the list into the user message text (closer to the generation boundary than the system prompt → higher adherence). After a successful response, new IDs are appended to the store. Survives app restarts.

The "exactly 5 recipes" invariant is enforced by `z.array(RecipeSchema).length(5)` at parse time — not by prompt engineering.

## Conventions

### Secrets

- `server/.env` — `ANTHROPIC_API_KEY`, `PORT`. Gitignored. Production values live in Railway env vars, not files.
- `mobile/.env.local` — `EXPO_PUBLIC_API_URL` only. **`EXPO_PUBLIC_*` vars are bundled into the mobile JS** and visible to anyone with the app. Never put a key there.

### Testing

- Coverage gate: 85%+ aggregate across all workspaces.
- Server: `supertest` for routes, mock `@anthropic-ai/sdk` constructor. Schema tests against Zod directly.
- Mobile: test hooks via `renderHook`; test the Zustand store directly (no rendering); component tests with `@testing-library/react-native`. Mock `expo-image-picker`, `expo-image-manipulator`, and `expo-router` at the Jest moduleNameMapper level.
- Wrap route-aware test renders in `<RouterProvider>` from `expo-router/testing-library`.
- Bootstrap files (`server/src/index.ts`'s `app.listen`, mobile's `registerRootComponent`) are excluded via `/* istanbul ignore next */` — they aren't meaningfully unit-testable.
- If a new screen depends on a native module, factor logic into a hook in `mobile/src/hooks/` and test the hook. Screens stay declarative.

### UI (Vercel guidelines, RN-translated)

The Vercel web guidelines (`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`) translate to RN as:

- Use `Pressable` (never raw `View` with `onPress`); set `accessibilityRole="button"` or `"link"`.
- Icon-only buttons need `accessibilityLabel`.
- Safe-area insets via `react-native-safe-area-context` (`SafeAreaProvider` at the root, `useSafeAreaInsets()` in screens that need it).
- Honor reduced motion: `AccessibilityInfo.isReduceMotionEnabled()` before any animation.
- Typography: `…` not `...`; curly quotes; `tabular-nums`-equivalent via `fontVariant: ['tabular-nums']` on time/serving counts.
- Always render explicit empty / loading / error states — never an empty `FlatList` with no message.
- Destructive actions (e.g. clearing seen-history) require a confirmation `Alert`.

### Hooks (Husky)

- **pre-commit** runs `lint-staged` only (`eslint --fix` + `prettier --write` on staged files; ~1–2 s).
- **pre-push** runs the full test suite with coverage gate.

The user wrote "pre-commit hook to run unit tests before pushing" — that's pre-push semantically. Tests on every commit kill flow; lint/format on every commit is fine.

### Commit & push cadence

Commit and push after every logical feature/bugfix. Doc updates (README, ARCHITECTURE.md, this file) belong **inside** the relevant commit — never a trailing "update docs" commit. The full commit sequence is in the plan file.

### TypeScript

Strict mode is on root-level (`tsconfig.base.json`). Workspaces extend it and override `module`/`target` if their runtime requires. Path aliases are not used cross-workspace — packages are referenced by their npm name (`recipe-planner-shared`) so npm workspaces' symlinking handles resolution at runtime.
