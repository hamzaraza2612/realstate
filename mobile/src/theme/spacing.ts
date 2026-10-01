/** 4-pt spacing rhythm (Tailwind's scale: 1 = 4px) and corner radii (web `--radius: 0.5rem`). */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
} as const

/** Minimum touch target (Apple HIG 44pt / Material 48dp — we use 44). */
export const HIT_TARGET = 44
