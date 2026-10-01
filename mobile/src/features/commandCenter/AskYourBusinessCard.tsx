import { router } from 'expo-router'
import { View } from 'react-native'
import { Button, Card, CardHeader, ListRow, Text, useToast } from '@/components'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useI18n } from '@/i18n'
import type { AiConversationSummaryDto } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { getAiErrorCode, useCreateAiConversation } from './api'

const AI_ERROR_KEYS: Record<string, string> = {
  ai_provider_not_configured: 'ask.error.notConfigured',
  ai_rate_limited: 'ask.error.rateLimited',
}

/** The Command Center's "Ask Your Business" entry: recent conversations (from the summary — no
 * extra request) plus "New conversation", each opening the full-screen chat. */
export function AskYourBusinessCard({ conversations }: { conversations: AiConversationSummaryDto[] }) {
  const { t } = useI18n()
  const toast = useToast()
  const { isOffline } = useNetworkStatus()
  const createConversation = useCreateAiConversation()

  async function handleNew() {
    try {
      const conversation = await createConversation.mutateAsync(null)
      router.push({ pathname: '/command-center/ask', params: { conversationId: conversation.id } })
    } catch (error) {
      const code = getAiErrorCode(error)
      toast({ title: t('ask.createError'), description: code && AI_ERROR_KEYS[code] ? t(AI_ERROR_KEYS[code]) : undefined, variant: 'error' })
    }
  }

  return (
    <Card>
      <CardHeader title={t('cc.ask')} subtitle={t('cc.askDescription')} />
      <Button
        label={t('cc.newConversation')}
        icon="add"
        onPress={handleNew}
        loading={createConversation.isPending}
        disabled={isOffline}
        fullWidth
      />
      {isOffline ? (
        <Text variant="caption" color="warning">
          {t('offline.actionDisabled')}
        </Text>
      ) : null}
      <View>
        <Text variant="overline" color="mutedForeground">
          {t('cc.recentConversations')}
        </Text>
        {conversations.length === 0 ? (
          <Text variant="bodySmall" color="mutedForeground">
            {t('cc.noConversations')}
          </Text>
        ) : (
          conversations.slice(0, 5).map((conversation) => (
            <ListRow
              key={conversation.id}
              icon="chatbubbles-outline"
              title={conversation.title}
              subtitle={formatDateTime(conversation.updatedAt)}
              onPress={() => router.push({ pathname: '/command-center/ask', params: { conversationId: conversation.id } })}
            />
          ))
        )}
      </View>
    </Card>
  )
}
