# Home Screen UI Polish — Design Spec

**Date:** 2026-05-06
**Status:** Approved

## Context

Codex generated the initial UI for the Smart Recipe Planner home screen. After review, four specific issues were identified:

1. The search/magnifier icon used as a decorative brand mark implies a tappable search interaction that doesn't exist.
2. The search icon on the "Find Recipes" button compounded the confusion.
3. The app title ("SMART RECIPE PLANNER") is illegibly small as an eyebrow label relative to the hero text.
4. On wide desktop viewports (1440px+), the two content panels float at the top with a large empty area below.
5. A secondary issue: the recipes screen stacks three accent color families on every card, which is visually noisy.

## Decisions

### 1. Brand mark icon → Sparkles

Replace the search/magnifier icon in the 48×48 brand mark badge with the **Sparkles** icon (already used on recipe card badges). Sparkles communicates the "Smart"/AI angle of the product, is passive (implies nothing tappable), and creates visual consistency between the home screen brand mark and the recipe cards.

**File:** `mobile/app/index.tsx` — the icon in the brand mark badge near the top of the left panel.
**Icon:** `Sparkles` from `lucide-react-native` (already imported on the recipes screen).

### 2. "Find Recipes" button → text only, no icon

Remove the search icon from the "Find Recipes" button. The label is self-explanatory and the icon was adding confusion (users might expect a search bar). A text-only primary button is cleaner and removes the last visual association with search.

**File:** `mobile/app/index.tsx` — the primary proceed button at the bottom of the left panel.

### 3. App title eyebrow → larger, colored, inline with brand mark icon

Replace the current tiny all-caps eyebrow text with a larger, green-colored label that sits **inline with the brand mark icon** on the same row. Specific changes:

- Font size: `fontSize.sm` (14px) — up from the current `fontSize.xs` (12px)
- Font weight: 700 (bold)
- Color: `color.primary` (#2F6F4E, sage green) instead of the current muted secondary color
- Letter spacing: keep the existing `0.08em` tracking
- Text: "Smart Recipe Planner" (title case, not all-caps — more readable at 14px)
- Layout: icon badge and app name label sit side-by-side in a `flexDirection: 'row'` container with `alignItems: 'center'` and an `8px` gap

**File:** `mobile/app/index.tsx` — the brand header block above the hero text.

### 4. Desktop layout → vertically centered

On wide screens (≥ 1024px), vertically center the two-panel layout within the viewport instead of letting it sit at the top. The empty space below becomes balanced padding rather than unused background.

**Implementation:** Add `justifyContent: 'center'` (and `flex: 1` if needed) to the outermost container when `isDesktop` or `isWide` is true. The `useResponsiveLayout` hook already provides the `isDesktop` flag.

**File:** `mobile/app/index.tsx` — the root `View` or `ScrollView` container that wraps both panels.

### 5. Recipe tags → single accent color (terracotta only)

On the recipes screen, every card currently renders three badge types simultaneously:

- Green muted badge: "AI generated" (Sparkles icon + citrus/green)
- Terracotta muted tags: recipe category tags
- Citrus muted tags: additional tags (e.g., "quick")

Consolidate to **terracotta only** for all recipe tags. Reserve the green badge exclusively for the "AI generated" / Sparkles badge (it's semantically distinct). Drop citrus (`color.citrus` / `color.citrusMuted`) from recipe tag backgrounds.

**File:** `mobile/app/recipes.tsx` — the tag row inside each recipe card.
**Token change:** Recipe tag pills: change background from `color.citrusMuted` / mixed to `color.accentMuted` (#F8DFD4) and text from citrus to `color.accent` (#D9673F) uniformly.

## Files to Modify

| File                     | Change                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `mobile/app/index.tsx`   | Brand mark icon (Search → Sparkles), button icon removal, eyebrow label resize + color, desktop vertical centering |
| `mobile/app/recipes.tsx` | Recipe tag pill colors consolidated to terracotta                                                                  |

## Notes

- Add `.superpowers/` to `.gitignore` — the visual companion session files written there should not be committed.

## Verification

1. Run `npm run typecheck` — confirm no type errors from icon name change.
2. Run `npm run lint` — confirm no lint issues.
3. Open web app locally (`npm run web -w mobile`) and verify at:
   - **Mobile (375px):** Sparkles brand mark visible, "Find Recipes" has no icon, app name is legible green text inline with icon.
   - **Desktop (1440px):** Panels are vertically centered in the viewport.
   - **Recipes screen:** All tag pills use terracotta background; only the "AI generated" badge uses green.
4. Run `npm test` to confirm no regressions.
