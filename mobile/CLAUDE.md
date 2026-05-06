# Mobile — Claude Code Context

Loaded automatically when working in `mobile/`. See root `CLAUDE.md` for
project-wide rules.

## Mobile Rules

- Use `StyleSheet.create` and `mobile/src/theme/tokens.ts` for all styling.
- Push native-module behavior into hooks under `mobile/src/hooks/`.
- Use `Pressable` for tappable elements; do not use `TouchableOpacity`.
- Set `accessibilityRole` on buttons/links and `accessibilityLabel` on
  ambiguous controls.
- Keep practical touch targets at least 44×44.
- Use safe-area insets via `react-native-safe-area-context`.
- Render explicit empty, loading, and error states.
- Confirm destructive actions with `Alert`.
- Web-only behavior must be gated with `Platform.OS === 'web'` or
  `Platform.select`. Do not rely on web-specific APIs on native.
