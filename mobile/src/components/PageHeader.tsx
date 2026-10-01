import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { spacing } from '@/theme'
import { Text } from './Text'

/** Screen title block — the mobile `PageHeader` (title, optional description, optional action). */
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {description ? (
          <Text variant="bodySmall" color="mutedForeground">
            {description}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  text: { flex: 1, gap: spacing.xs },
})
