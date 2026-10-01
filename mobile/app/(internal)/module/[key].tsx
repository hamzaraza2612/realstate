import { Redirect, Stack, useLocalSearchParams } from 'expo-router'
import { ModulePlaceholderScreen } from '@/features/work/ModulePlaceholderScreen'
import { useI18n } from '@/i18n'
import { isModuleKey, MODULES } from '@/navigation/modules'

/** `/module/:key` — Phase 1 placeholder for module screens later phases build. */
export default function ModuleRoute() {
  const { key } = useLocalSearchParams<{ key: string }>()
  const { t } = useI18n()
  if (!isModuleKey(key)) return <Redirect href="/work" />
  const module = MODULES.find((m) => m.key === key)
  return (
    <>
      <Stack.Screen options={{ title: module ? t(module.labelKey) : '' }} />
      <ModulePlaceholderScreen moduleKey={key} />
    </>
  )
}
