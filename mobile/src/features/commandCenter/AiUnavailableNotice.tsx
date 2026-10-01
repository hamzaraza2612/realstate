import { StyleSheet, View } from 'react-native'
import { Card, Icon, Text } from '@/components'
import { useI18n } from '@/i18n'
import { spacing, useTheme } from '@/theme'

/** Shown in place of "Ask Your Business" / "Recommended Actions" when
 * `summary.aiProviderConfigured === false`. Business Health and Attention items are deterministic
 * ERP data and keep working regardless — only the model-driven parts depend on a provider. */
export function AiUnavailableNotice({ title }: { title: string }) {
  const { t } = useI18n()
  const { colors } = useTheme()
  return (
    <Card>
      <View style={styles.row}>
        <Icon name="information-circle-outline" size={22} color={colors.mutedForeground} />
        <View style={styles.text}>
          <Text variant="subheading">{title}</Text>
          <Text variant="bodySmall" style={{ fontWeight: '600' }}>
            {t('cc.aiUnavailableTitle')}
          </Text>
          <Text variant="bodySmall" color="mutedForeground">
            {t('cc.aiUnavailableDescription')}
          </Text>
        </View>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  text: { flex: 1, gap: spacing.xs },
})
