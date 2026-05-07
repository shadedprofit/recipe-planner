# Deployment

The recommended deployment topology:

- **GitHub Actions** — CI on every push/PR; dev frontend to GitHub Pages +
  backend to Railway on every push to `main`.
- **Vercel** — production frontend (Expo Web static build).
- **Railway** — Express backend and persistent SQLite volume.

This keeps the browser app on a static host while the API runs as a normal
container with writable storage for `better-sqlite3`.

Use Node 22 or newer for both services. The repository `package.json` declares
that engine requirement; if Vercel asks for an explicit setting, choose Node
22.x or newer in Project Settings.

## CI/CD via GitHub Actions

Two workflow files live in `.github/workflows/`:

**`ci.yml`** — runs on every push and pull request:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run format:check`
- `npm test`

**`deploy.yml`** — runs on push to `main`, two parallel jobs:

_deploy-frontend_ — builds `mobile/dist` with `EXPO_PUBLIC_API_URL` set from
the `DEV_API_URL` secret, copies `index.html → 404.html` for SPA routing, then
deploys to GitHub Pages.

_deploy-backend_ — installs the Railway CLI and runs `railway up` to redeploy
the server service.

### Required GitHub Secrets

Set these in **Settings → Secrets and variables → Actions**:

| Secret            | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| `DEV_API_URL`     | Dev backend URL (e.g. your Railway service public URL) |
| `RAILWAY_TOKEN`   | Railway API token (Account Settings → Tokens)          |
| `RAILWAY_SERVICE` | Railway service name, e.g. `server`                    |

### Enable GitHub Pages

In **Settings → Pages**, set source to **GitHub Actions**. The `deploy.yml`
workflow handles the rest.

---

## Backend On Railway

Create a Railway service from this repository and deploy `server/Dockerfile`.

Set environment variables:

```bash
INGREDIENT_EXTRACTION_PROVIDER=gemini
RECIPE_GENERATION_PROVIDER=gemini
GEMINI_API_KEY=<real Gemini API key>
GEMINI_INGREDIENT_MODEL=gemini-2.5-flash
GEMINI_RECIPE_MODEL=gemini-2.5-flash-lite
PORT=3001
RECIPE_DB_PATH=/data/recipes.db
```

Add a Railway persistent volume mounted at `/data` so the SQLite recipe cache
survives deploys and restarts.

The Express app already enables CORS for the demo API, so the Vercel frontend
can call the Railway backend from a different origin.

After deploy, verify:

```bash
curl https://<railway-service-url>/health
```

## Frontend On Vercel

Create a Vercel project from the repo root. The checked-in `vercel.json` tells
Vercel to install from the monorepo root, build the mobile workspace, and serve
`mobile/dist`. It also selects the "Other" framework preset and disables Husky
during install with `HUSKY=0 npm ci`.

Set this Vercel environment variable:

```bash
EXPO_PUBLIC_API_URL=https://<railway-service-url>
```

Then deploy. Vercel runs:

```bash
npm run build:web -w mobile
```

## Local Full-Stack Demo

For a quick local browser demo, populate `server/.env` with a real
`GEMINI_API_KEY`, then run:

```bash
npm run demo
```

Open:

- Web app: `http://localhost:8080`
- Backend health: `http://localhost:3001/health`

The local Compose web build defaults to
`EXPO_PUBLIC_API_URL=http://localhost:3001`, because the JavaScript runs in your
browser and must call the host-exposed backend URL.

Stop the local demo with:

```bash
npm run demo:down
```
