export const tokens = {
  colors: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    primary: '#000000',
    primaryMuted: '#333333',
    text: '#111111',
    textSecondary: '#666666',
    textMuted: '#999999',
    border: '#E5E5E5',
    borderStrong: '#CCCCCC',
    success: '#16A34A',
    error: '#DC2626',
    skeleton: '#E5E5E5',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export type Tokens = typeof tokens;
