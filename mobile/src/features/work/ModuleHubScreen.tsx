import { router, type Href } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Card, EmptyState, ListRow, PageHeader } from '@/components'
import type { IconName } from '@/components/Icon'
import { Screen } from '@/components/Screen'
import { useAuth } from '@/auth'
import { useI18n } from '@/i18n'
import { spacing, useTheme } from '@/theme'

export interface ModuleSection {
  key: string
  labelKey: string
  descriptionKey: string
  icon: IconName
  href: Href
  /** Same permission the web nav item for this page uses (`components/layout/navigation.ts`). */
  permission: string
}

/**
 * A module's landing screen inside the "Work" tab (CRM, Property, Construction, …): the module's
 * sub-areas as a short list, each filtered by its web permission, pushing that area's list screen.
 */
export function ModuleHubScreen({ titleKey, descriptionKey, sections }: { titleKey: string; descriptionKey: string; sections: ModuleSection[] }) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const { hasPermission } = useAuth()
  const visible = sections.filter((section) => hasPermission(section.permission))

  return (
    <Screen edges={[]}>
      <PageHeader title={t(titleKey)} description={t(descriptionKey)} />
      {visible.length === 0 ? (
        <EmptyState icon="lock-closed-outline" title={t('work.emptyTitle')} description={t('work.emptyDescription')} />
      ) : (
        <Card style={styles.card}>
          {visible.map((section, index) => (
            <View key={section.key} style={index > 0 ? [styles.divider, { borderTopColor: colors.border }] : undefined}>
              <ListRow icon={section.icon} title={t(section.labelKey)} subtitle={t(section.descriptionKey)} onPress={() => router.push(section.href)} />
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
