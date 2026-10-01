import { Card, EmptyState } from '@/components'
import { Screen } from '@/components/Screen'
import { useI18n } from '@/i18n'
import { MODULES, type ModuleKey } from '@/navigation/modules'

/** Stand-in for module screens that later phases build (CRM, Sales, Property, …). */
export function ModulePlaceholderScreen({ moduleKey }: { moduleKey: ModuleKey }) {
  const { t } = useI18n()
  const module = MODULES.find((m) => m.key === moduleKey)
  const name = module ? t(module.labelKey) : moduleKey
  return (
    <Screen edges={[]}>
      <Card>
        <EmptyState icon={module?.icon ?? 'construct-outline'} title={t('placeholder.title')} description={t('placeholder.description', { module: name })} />
      </Card>
    </Screen>
  )
}
