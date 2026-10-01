import type { ReactNode } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { SafeAreaView, type Edge } from 'react-native-safe-area-context'
import { spacing, useTheme } from '@/theme'

/**
 * Standard screen scaffold: themed background, safe-area padding, and (when `onRefresh` is given)
 * native pull-to-refresh — the mobile replacement for a web page-level refresh button.
 * Pass `scroll={false}` for screens that own their own FlatList.
 */
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  scroll = true,
  edges = ['top'],
  contentStyle,
}: {
  children: ReactNode
  onRefresh?: () => void
  refreshing?: boolean
  scroll?: boolean
  edges?: Edge[]
  contentStyle?: StyleProp<ViewStyle>
}) {
  const { colors } = useTheme()
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
})
