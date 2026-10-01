/**
 * Color tokens — the mobile translation of the web app's M17 CSS variables
 * (`frontend/src/index.css`, HSL → hex) and the shared StatusBadge tone palette
 * (`frontend/src/components/common/StatusBadge.tsx`'s Tailwind emerald/amber/red/blue/slate pairs).
 * Every component and screen reads colors from here via `useTheme()`, never a literal hex, so the
 * whole app stays one visual family in both light and dark mode.
 */

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface ToneColors {
  background: string
  border: string
  text: string
  dot: string
}

export interface ColorPalette {
  background: string
  foreground: string
  card: string
  cardForeground: string
  border: string
  input: string
  primary: string
  primaryForeground: string
  primarySoft: string
  muted: string
  mutedForeground: string
  destructive: string
  destructiveForeground: string
  success: string
  warning: string
  overlay: string
  skeleton: string
  tabBar: string
  tones: Record<StatusTone, ToneColors>
}

export const lightColors: ColorPalette = {
  background: '#f9fafb',
  foreground: '#1b202d',
  card: '#ffffff',
  cardForeground: '#1b202d',
  border: '#dcdfe5',
  input: '#dcdfe5',
  primary: '#0842a1',
  primaryForeground: '#ffffff',
  primarySoft: 'rgba(8, 66, 161, 0.08)',
  muted: '#edf0f3',
  mutedForeground: '#6b7280',
  destructive: '#c52020',
  destructiveForeground: '#ffffff',
  success: '#238055',
  warning: '#da7a0b',
  overlay: 'rgba(15, 23, 42, 0.45)',
  skeleton: '#e5e8ec',
  tabBar: '#ffffff',
  tones: {
    success: { background: '#ecfdf5', border: '#a7f3d0', text: '#065f46', dot: '#10b981' },
    warning: { background: '#fffbeb', border: '#fde68a', text: '#92400e', dot: '#f59e0b' },
    danger: { background: '#fef2f2', border: '#fecaca', text: '#991b1b', dot: '#ef4444' },
    info: { background: '#eff6ff', border: '#bfdbfe', text: '#1e40af', dot: '#3b82f6' },
    neutral: { background: '#f8fafc', border: '#e2e8f0', text: '#334155', dot: '#94a3b8' },
  },
}

export const darkColors: ColorPalette = {
  background: '#11141d',
  foreground: '#edf0f3',
  card: '#171c26',
  cardForeground: '#edf0f3',
  border: '#2d3643',
  input: '#2d3643',
  primary: '#3c83f6',
  primaryForeground: '#11141d',
  primarySoft: 'rgba(60, 131, 246, 0.14)',
  muted: '#252c37',
  mutedForeground: '#9ba4b0',
  destructive: '#d02f2f',
  destructiveForeground: '#ffffff',
  success: '#3b9b6e',
  warning: '#e89230',
  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#252c37',
  tabBar: '#171c26',
  tones: {
    success: { background: 'rgba(16, 185, 129, 0.10)', border: 'rgba(16, 185, 129, 0.30)', text: '#6ee7b7', dot: '#10b981' },
    warning: { background: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.30)', text: '#fcd34d', dot: '#f59e0b' },
    danger: { background: 'rgba(239, 68, 68, 0.10)', border: 'rgba(239, 68, 68, 0.30)', text: '#fca5a5', dot: '#ef4444' },
    info: { background: 'rgba(59, 130, 246, 0.10)', border: 'rgba(59, 130, 246, 0.30)', text: '#93c5fd', dot: '#3b82f6' },
    neutral: { background: 'rgba(100, 116, 139, 0.10)', border: 'rgba(100, 116, 139, 0.30)', text: '#cbd5e1', dot: '#94a3b8' },
  },
}
