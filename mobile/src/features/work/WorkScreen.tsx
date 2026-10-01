import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Card, EmptyState, ListRow, PageHeader } from '@/components'
import { Screen } from '@/components/Screen'
import { useI18n } from '@/i18n'
import { useVisibleModules } from '@/navigation/modules'
import { spacing, useTheme } from '@/theme'

/** "Work" tab — the role-filtered list of module shortcuts (see `navigation/modules.ts`). */
export function WorkScreen() {
  const { t } = useI18n()
  const { colors } = useTheme()
  const modules = useVisibleModules()

  return (
    <Screen>
      <PageHeader title={t('work.title')} description={t('work.description')} />
      {modules.length === 0 ? (
        <EmptyState icon="briefcase-outline" title={t('work.emptyTitle')} description={t('work.emptyDescription')} />
      ) : (
        <Card style={styles.card}>
          {modules.map((module, index) => (
            <View key={module.key} style={index > 0 ? [styles.divider, { borderTopColor: colors.border }] : undefined}>
              <ListRow icon={module.icon} title={t(module.labelKey)} subtitle={t(module.descriptionKey)} onPress={() => router.push(module.href)} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: { paddingVertical: spacing.xs, gap: 0 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
})
