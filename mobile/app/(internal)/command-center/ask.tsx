import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { EmptyState } from '@/components'
import { ConversationView } from '@/features/commandCenter/ConversationView'
import { useI18n } from '@/i18n'
import { useTheme } from '@/theme'

/** `/command-center/ask?conversationId=…` — full-screen "Ask Your Business" chat. */
export default function AskRoute() {
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>()
  const { colors } = useTheme()
  const { t } = useI18n()
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {conversationId ? <ConversationView conversationId={conversationId} /> : <EmptyState title={t('ask.loadError')} />}
    </View>
  )
}
