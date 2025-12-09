import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Hook to get theme-aware colors
 * Returns the complete color palette for the current theme
 * 
 * Usage:
 * const colors = useThemedColors();
 * <View style={{ backgroundColor: colors.background }}>
 *   <Text style={{ color: colors.text }}>Hello</Text>
 * </View>
 */
export function useThemedColors() {
  const { theme } = useTheme();
  return Colors[theme];
}
