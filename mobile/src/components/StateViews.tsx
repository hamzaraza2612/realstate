import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { useI18n } from '@/i18n'
import { radius, spacing, useTheme } from '@/theme'
import { Button } from './Button'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

/** Ports of the web `components/common/StateViews.tsx` trio: Empty / Loading (skeleton) / Error. */

export function EmptyState({
  title,
  description,
  icon = 'file-tray-outline',
  action,
}: {
  title: string
  description?: string
  icon?: IconName
  action?: ReactNode
}) {
  const { colors } = useTheme()
  return (
    <View style={styles.center} accessible accessibilityLabel={[title, description].filter(Boolean).join('. ')}>
      <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
        <Icon name={icon} size={24} color={colors.mutedForeground} />
      </View>
      <Text variant="subheading" style={styles.centerText}>
        {title}
      </Text>
      {description ? (
        <Text variant="bodySmall" color="mutedForeground" style={styles.centerText}>
          {description}
        </Text>
      ) : null}
      {action}
    </View>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n()
  const { colors } = useTheme()
  return (
    <View style={styles.center} accessibilityRole="alert">
      <View style={[styles.iconCircle, { backgroundColor: colors.tones.danger.background }]}>
        <Icon name="alert-circle-outline" size={24} color={colors.tones.danger.dot} />
      </View>
      <Text variant="subheading" style={styles.centerText}>
        {message}
      </Text>
      {onRetry ? <Button label={t('common.retry')} variant="outline" size="sm" icon="refresh" onPress={onRetry} /> : null}
    </View>
  )
}

/** A pulsing placeholder block. */
export function Skeleton({ height = 14, width = '100%', style }: { height?: number; width?: number | `${number}%`; style?: object }) {
  const { colors } = useTheme()
  const opacity = useRef(new Animated.Value(0.5)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])
  return <Animated.View style={[{ height, width, borderRadius: radius.sm, backgroundColor: colors.skeleton, opacity }, style]} />
}

/** Skeleton-based loading state, shaped like the content it replaces (cards or list rows). */
export function LoadingState({ variant = 'list', rows = 3, label }: { variant?: 'list' | 'cards'; rows?: number; label?: string }) {
  const { t } = useI18n()
  const { colors } = useTheme()
  return (
    <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel={label ?? t('common.loading')}>
      {Array.from({ length: rows }).map((_, index) =>
        variant === 'cards' ? (
          <View key={index} style={[styles.skeletonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Skeleton width="40%" height={12} />
            <Skeleton width="70%" height={20} />
            <Skeleton width="90%" height={12} />
          </View>
        ) : (
          <View key={index} style={styles.skeletonRow}>
            <Skeleton width={36} height={36} style={{ borderRadius: 18 }} />
            <View style={styles.skeletonLines}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="85%" height={12} />
            </View>
          </View>
        ),
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  centerText: { textAlign: 'center' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  loading: { gap: spacing.md, paddingVertical: spacing.sm },
  skeletonCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  skeletonLines: { flex: 1, gap: spacing.xs + 2 },
})
