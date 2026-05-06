# Home Screen UI Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five visual issues on the home and recipes screens: replace the non-functional search brand mark with Sparkles, remove the icon from the Find Recipes button, make the app title legible and inline with the icon, vertically center the desktop layout, and consolidate recipe badge color to green.

**Architecture:** All changes are isolated to two screen files and one config file — no new components, no logic changes, no API contract changes. Pure style and icon swaps.

**Tech Stack:** React Native StyleSheet, lucide-react-native icons, Expo Router, existing `tokens` design system, `useResponsiveLayout` hook.

---

## File Map

| File                     | What changes                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `mobile/app/index.tsx`   | Icon import, brand mark icon, eyebrow style, button icon removal, desktop scroll centering |
| `mobile/app/recipes.tsx` | Recipe badge background color                                                              |
| `.gitignore`             | Add `.superpowers/`                                                                        |

---

## Task 1: Establish test baseline

**Files:**

- Read-only — just running the suite

- [ ] **Step 1: Run the mobile test suite**

```bash
npm test -w mobile
```

Expected: all tests pass. Note the count so you can confirm no regressions after changes.

---

## Task 2: Update `index.tsx` — icon, eyebrow, button, desktop centering

**Files:**

- Modify: `mobile/app/index.tsx`

- [ ] **Step 1: Update the lucide import — swap `Search` for `Sparkles`**

Line 13 currently reads:

```tsx
import { Camera, ImagePlus, Search, X } from 'lucide-react-native';
```

Replace with:

```tsx
import { Camera, ImagePlus, Sparkles, X } from 'lucide-react-native';
```

- [ ] **Step 2: Wrap the brand mark and eyebrow in a row container**

Lines 57–60 currently read:

```tsx
<View style={styles.brandMark}>
  <Search size={22} color={tokens.colors.primaryStrong} strokeWidth={2.5} />
</View>
<Text style={styles.eyebrow}>Smart Recipe Planner</Text>
```

Replace with:

```tsx
<View style={styles.brandHeader}>
  <View style={styles.brandMark}>
    <Sparkles size={22} color={tokens.colors.primaryStrong} strokeWidth={2.5} />
  </View>
  <Text style={styles.eyebrow}>Smart Recipe Planner</Text>
</View>
```

- [ ] **Step 3: Remove the Search icon from the Find Recipes button**

Lines 129–132 inside the `Pressable` proceedBtn currently read:

```tsx
<Search
  size={20}
  color={canProceed ? tokens.colors.surface : tokens.colors.textSecondary}
/>
<Text style={[styles.proceedBtnText, !canProceed && styles.proceedBtnTextDisabled]}>
  Find Recipes
</Text>
```

Replace with (icon removed, Text only):

```tsx
<Text style={[styles.proceedBtnText, !canProceed && styles.proceedBtnTextDisabled]}>
  Find Recipes
</Text>
```

- [ ] **Step 4: Add `scrollContentWide` to the ScrollView contentContainerStyle**

Lines 47–53 currently read:

```tsx
<ScrollView
  contentContainerStyle={[
    styles.scrollContent,
    {
      paddingTop: insets.top + tokens.spacing.lg,
      paddingBottom: insets.bottom + tokens.spacing.lg,
    },
  ]}
>
```

Replace with:

```tsx
<ScrollView
  contentContainerStyle={[
    styles.scrollContent,
    layout.isWide && styles.scrollContentWide,
    {
      paddingTop: insets.top + tokens.spacing.lg,
      paddingBottom: insets.bottom + tokens.spacing.lg,
    },
  ]}
>
```

- [ ] **Step 5: Update the StyleSheet**

In the `StyleSheet.create({...})` block (starting at line 192), make three changes:

**a. Add `brandHeader` before `brandMark`:**

```tsx
brandHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: tokens.spacing.sm,
  marginBottom: tokens.spacing.lg,
},
```

**b. Remove `marginBottom` from `brandMark`** (it now lives on `brandHeader`):

```tsx
brandMark: {
  width: 48,
  height: 48,
  borderRadius: tokens.radius.lg,
  backgroundColor: tokens.colors.primaryMuted,
  alignItems: 'center',
  justifyContent: 'center',
},
```

**c. Update `eyebrow`** — larger font, primary green color, title-case (drop uppercase transform):

```tsx
eyebrow: {
  color: tokens.colors.primary,
  fontSize: tokens.fontSize.sm,
  fontWeight: '800',
  letterSpacing: 0,
},
```

**d. Add `scrollContentWide` after `scrollContent`:**

```tsx
scrollContentWide: {
  justifyContent: 'center',
},
```

- [ ] **Step 6: Run typecheck and lint**

```bash
npm run typecheck -w mobile && npm run lint -w mobile
```

Expected: no errors. If `Search` is flagged as unused, you missed removing it from the import in Step 1.

- [ ] **Step 7: Commit**

```bash
git add mobile/app/index.tsx
git commit -m "feat: polish home screen — sparkles brand mark, no button icon, legible eyebrow, desktop centering"
```

---

## Task 3: Update `recipes.tsx` — badge background color

**Files:**

- Modify: `mobile/app/recipes.tsx`

- [ ] **Step 1: Change `recipeBadge` background from `citrusMuted` to `primaryMuted`**

In the `StyleSheet.create({...})` block, find `recipeBadge` (around line 578):

```tsx
recipeBadge: {
  width: 34,
  height: 34,
  borderRadius: tokens.radius.full,
  backgroundColor: tokens.colors.citrusMuted,
  alignItems: 'center',
  justifyContent: 'center',
},
```

Replace `tokens.colors.citrusMuted` with `tokens.colors.primaryMuted`:

```tsx
recipeBadge: {
  width: 34,
  height: 34,
  borderRadius: tokens.radius.full,
  backgroundColor: tokens.colors.primaryMuted,
  alignItems: 'center',
  justifyContent: 'center',
},
```

The icon color (`tokens.colors.primaryStrong`) and tag colors (`accentMuted` / `accent`) are already correct — no other changes needed in this file.

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck -w mobile && npm run lint -w mobile
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/app/recipes.tsx
git commit -m "feat: use green badge for AI sparkles icon on recipe cards"
```

---

## Task 4: Add `.superpowers/` to `.gitignore`

**Files:**

- Modify: `.gitignore`

- [ ] **Step 1: Append `.superpowers/` to `.gitignore`**

Open `.gitignore` at the repo root and add this line in the "build outputs / tooling" section (or at the end):

```
.superpowers/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore .superpowers brainstorm sessions"
```

---

## Task 5: Final verification

- [ ] **Step 1: Run the full test suite**

```bash
npm test -w mobile
```

Expected: same number of tests pass as the baseline in Task 1.

- [ ] **Step 2: Run format check**

```bash
npm run format:check
```

Expected: no issues. If there are, run `npm run format` and re-check.

- [ ] **Step 3: Visual check — start the web app**

```bash
npm run web -w mobile
```

Open `http://localhost:8081` (or whichever port Expo reports) and verify:

| Check                  | Expected                                                        |
| ---------------------- | --------------------------------------------------------------- |
| Home screen brand mark | Sparkles icon, sage green background badge                      |
| App name eyebrow       | "Smart Recipe Planner" in green, same row as the icon, readable |
| Find Recipes button    | Text only, no icon                                              |
| Desktop (≥1024px)      | The two panels are vertically centered in the viewport          |
| Mobile (375px)         | Layout unchanged — stacked, top-aligned                         |
| Recipes screen badges  | Sparkles badge has green (primaryMuted) background              |
| Recipe tag pills       | Terracotta background and text (unchanged from before)          |
