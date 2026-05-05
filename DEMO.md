# Demo Guide

This guide runs a local demo of the core product flow:

1. Start the backend.
2. Start the Expo mobile app.
3. Upload one or more demo ingredient images.
4. Generate recipes and open a recipe detail screen.

The mobile app still runs through Expo Go, an iOS simulator, or an Android
emulator. Docker Compose currently starts the backend only; this avoids the
networking friction of trying to run a native Expo client inside Docker.

## Prerequisites

- Node 22 or newer.
- Expo-compatible mobile environment.
- `GEMINI_API_KEY` for ingredient extraction and recipe generation.

## Demo Assets

Generated demo-safe ingredient photos live in `demo-assets/`:

- `vegetable-pasta-counter.png`: tomatoes, peppers, zucchini, garlic, onion,
  basil, olive oil, and pasta.
- `breakfast-ingredients.png`: eggs, spinach, mushrooms, tomatoes, cheddar,
  bread, avocado, and milk.
- `chickpea-rice-dinner.png`: chickpeas, rice, carrots, broccoli, lemon,
  ginger, garlic, cilantro, yogurt, and spices.

These images were generated for this repository and contain no intentional
brand names, labels, or watermarks.

To use them in the mobile flow:

- iOS Simulator: drag the images from `demo-assets/` onto the simulator window
  or import them into Photos.
- Android Emulator: drag the images into the emulator or copy them into the
  emulator's Pictures/Downloads folder.
- Physical device: AirDrop, message, or otherwise copy the images to the
  device photo library. As a fallback for a live demo, you can photograph the
  images from your computer screen, but direct copies usually produce cleaner
  ingredient extraction.

## Backend With Docker Compose

Create `server/.env` from `server/.env.example` and fill in real keys:

```bash
cp server/.env.example server/.env
```

Replace the placeholder `GEMINI_API_KEY=...` value before running the demo.
`ANTHROPIC_API_KEY` can stay commented out unless you explicitly switch a
provider to Claude. Keep `server/.env` as plain `KEY=value` lines; avoid inline
`#` comments on values because Docker Compose env-file parsing can differ from
shell dotenv parsing.

Then start the backend:

```bash
npm run demo:server
```

That script runs `docker compose --env-file server/.env up --build`. If you
prefer exporting environment variables yourself, `docker compose up --build`
also works.

By default, the backend listens on `http://localhost:3001`. If you set `PORT` in
`server/.env`, Compose maps that same host and container port. Check it with:

```bash
curl http://localhost:3001/health
```

SQLite recipe cache data is stored in the named Docker volume
`recipe-planner-data`.

## Backend Without Docker

```bash
npm install
npm run dev -w server
```

## Mobile App

Create `mobile/.env.local` from `mobile/.env.example`:

```bash
cp mobile/.env.example mobile/.env.local
```

Set `EXPO_PUBLIC_API_URL` to a URL reachable from the mobile runtime:

- iOS simulator: `http://localhost:3001`
- Android emulator: `http://10.0.2.2:3001`
- Physical device: `http://<your-computer-lan-ip>:3001`

Then start Expo:

```bash
npm run start -w mobile
```

## Demo Script

1. Open the app in Expo Go or a simulator.
2. Tap to select images from the library.
3. Choose one or more images from `demo-assets/`.
4. Generate recipes.
5. Tap a recipe to open detail.
6. Restart the mobile app and reopen the same recipe detail route if you want
   to show that the recipe id resolves from server-side SQLite persistence.

## Current Limitations

- The default demo depends on live Gemini API calls.
- Recipe generation is cached model output for the demo, not a permanent recipe
  provider database.
- Docker Compose starts the backend only. A full one-command browser demo would
  require adding and validating Expo Web support first.
