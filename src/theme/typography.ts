import { Platform } from 'react-native';

export const Typography = {
  fontFamilies: {
    heading: Platform.select({
      android: 'sans-serif-medium',
      ios: 'System',
      default: 'System',
    }),
    code: Platform.select({
      android: 'monospace',
      ios: 'Menlo',
      default: 'monospace',
    }),
    body: Platform.select({
      android: 'sans-serif',
      ios: 'System',
      default: 'System',
    }),
  },
  fontSize: {
    micro: 10,
    tiny: 11,
    caption: 12,
    bodySm: 13,
    body: 14,
    bodyLg: 16,
    subheading: 18,
    heading: 20,
    title: 24,
    stationCode: 32,
    huge: 36,
  },
  lineHeight: {
    caption: 16,
    body: 20,
    bodyLg: 24,
    subheading: 26,
    heading: 28,
    title: 32,
    stationCode: 38,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};
