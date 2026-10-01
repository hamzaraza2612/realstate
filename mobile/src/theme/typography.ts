import type { TextStyle } from 'react-native'

/** Type scale — the mobile counterpart of the web's text-xs … text-2xl usage in M17 pages.
 * System font on each platform (SF Pro / Roboto), which also renders Arabic correctly. */
export const typography = {
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  subheading: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodySmall: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  stat: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  mono: { fontSize: 12, lineHeight: 16, fontFamily: 'monospace' },
} satisfies Record<string, TextStyle>
