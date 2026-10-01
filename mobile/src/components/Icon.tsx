import { I18nManager, type ColorValue } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { ComponentProps } from 'react'

export type IconName = ComponentProps<typeof Ionicons>['name']

/** Directional glyphs that must mirror in RTL (a "forward" chevron points left in Arabic). */
const DIRECTIONAL = new Set<string>(['chevron-forward', 'chevron-back', 'arrow-forward', 'arrow-back', 'send'])

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: ColorValue }) {
  const flip = I18nManager.isRTL && DIRECTIONAL.has(name)
  return <Ionicons name={name} size={size} color={color} style={flip ? { transform: [{ scaleX: -1 }] } : undefined} />
}
