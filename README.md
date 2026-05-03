# Smart Recipe Planner

Take a photo of your ingredients, get 5 structured recipes you can make. Refresh for 5 new recipes, with no repeats across the session.

A take-home assignment for a Forward Deployed Engineering role at Tenex.

## Stack

- **Mobile**: Expo (TypeScript) — camera + library upload, Expo Router, Zustand + AsyncStorage, TanStack Query
- **Backend**: Node + Express (TypeScript) — Anthropic Claude Sonnet 4.6 for vision and recipe generation, structured output via tool-use
- **Shared**: Zod schemas consumed by both apps
- **Hosting**: Railway (backend), Expo Go (mobile demo)

## Repo Layout

```
mobile/   Expo app
server/   Express backend
shared/   Zod schemas + types
```

## Quick Start

```bash
npm install
npm run lint
npm run typecheck
npm test
```

Per-workspace details land in subsequent commits as the scaffold fills in.

## Environment Files

Each workspace owns its own env config:

- `server/.env` — `ANTHROPIC_API_KEY`, `PORT` (gitignored; `.env.example` committed)
- `mobile/.env.local` — `EXPO_PUBLIC_API_URL` (gitignored; `.env.example` committed)

`EXPO_PUBLIC_*` vars are bundled into the mobile JS — secrets stay server-side.
