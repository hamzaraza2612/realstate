import { Text as RNText, type TextProps as RNTextProps } from 'react-native'
import { typography, useTheme, type ColorPalette } from '@/theme'

type Variant = keyof typeof typography
type ColorKey = 'foreground' | 'mutedForeground' | 'primary' | 'destructive' | 'success' | 'warning' | 'primaryForeground'

export interface TextProps extends RNTextProps {
  variant?: Variant
  color?: ColorKey
}

/** Themed text — every string in the app renders through this so it picks up the type scale and
 * the light/dark palette. `textAlign` is left to the platform default ("auto"), which follows the
 * RTL layout direction automatically. */
export function Text({ variant = 'body', color = 'foreground', style, ...props }: TextProps) {
  const { colors } = useTheme()
  return <RNText {...props} style={[typography[variant], { color: colors[color as keyof ColorPalette] as string }, style]} />
}
