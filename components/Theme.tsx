import { useColorScheme } from 'react-native';

export type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type ColorName = keyof typeof colors.light & keyof typeof colors.dark;

export const colors = {
  light: {
    primary: '#007AFF',
    background: '#F8F9FA',
    card: '#FFFFFF',
    text: '#000000',
    border: '#E5E5E5',
    notification: '#FF3B30',
    tint: '#2196F3',
    tabIconDefault: '#CCCCCC',
    tabIconSelected: '#2196F3',
  },
  dark: {
    primary: '#0A84FF',
    background: '#000000',
    card: '#1C1C1E',
    text: '#FFFFFF',
    border: '#38383A',
    notification: '#FF453A',
    tint: '#2196F3',
    tabIconDefault: '#666666',
    tabIconSelected: '#2196F3',
  },
};

export function useThemeColor(
  props: ThemeProps,
  colorName: ColorName
): string {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme === 'light' ? 'lightColor' : 'darkColor'];

  if (colorFromProps) {
    return colorFromProps;
  }
  return colors[theme][colorName];
}