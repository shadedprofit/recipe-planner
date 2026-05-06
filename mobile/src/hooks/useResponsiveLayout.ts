import { useWindowDimensions } from 'react-native';
import { tokens } from '../theme/tokens';

export type LayoutSize = 'phone' | 'tablet' | 'desktop';

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();

  const size: LayoutSize =
    width >= tokens.layout.desktopBreakpoint
      ? 'desktop'
      : width >= tokens.layout.tabletBreakpoint
        ? 'tablet'
        : 'phone';

  return {
    width,
    size,
    isTablet: size === 'tablet',
    isDesktop: size === 'desktop',
    isWide: size !== 'phone',
  };
}
