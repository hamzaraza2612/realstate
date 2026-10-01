import { useRef, useState } from 'react'
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ErrorState, Icon, LoadingState, Text } from '@/components'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useI18n } from '@/i18n'
import { radius, spacing, typography, useTheme } from '@/theme'
import { AiMessageRole, AiMessageStatus, type AiMessageDto } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { getAiErrorCode, useAiConversation, useAskAi } from './api'
import { JsonDataView } from './JsonDataView'

const AI_ERROR_KEYS: Record<string, string> = {
  ai_provider_not_configured: 'ask.error.notConfigured',
  ai_rate_limited: 'ask.error.rateLimited',
}

/**
 * "Ask Your Business" chat — message list + input + send, calling
 * `POST /ai/conversations/{id}/messages`. Port of the web `ConversationPanel.tsx`'s
 * `ActiveConversation`/`MessageTurn`: an assistant turn always keeps its prose (`content`) visually
 * separate from its structured `facts` ("Sources" block) and the tools it used (`toolCalls`).
 */
export function ConversationView({ conversationId }: { conversationId: string }) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { isOffline } = useNetworkStatus()
  const { data: conversation, isLoading, isError, refetch } = useAiConversation(conversationId)
  const askAi = useAskAi()
  const [question, setQuestion] = useState('')
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const listRef = useRef<FlatList<AiMessageDto>>(null)

  if (isLoading) return <View style={styles.padded}><LoadingState rows={4} /></View>
  if (isError || !conversation) return <ErrorState message={t('ask.loadError')} onRetry={() => refetch()} />

  async function handleSend() {
    const trimmed = question.trim()
    if (!trimmed || askAi.isPending || isOffline) return
    setInlineError(null)
    setPendingQuestion(trimmed)
    setQuestion('')
    try {
      await askAi.mutateAsync({ conversationId, question: trimmed })
    } catch (error) {
      const code = getAiErrorCode(error)
      setInlineError(code && AI_ERROR_KEYS[code] ? t(AI_ERROR_KEYS[code]) : t('ask.error.generic'))
      setQuestion(trimmed)
    } finally {
      setPendingQuestion(null)
    }
  }

  const messages = conversation.messages.filter((m) => m.role === AiMessageRole.User || m.role === AiMessageRole.Assistant)
  const canSend = !!question.trim() && !askAi.isPending && !isOffline

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <FlatList
        ref={listRef}
        style={styles.flex}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <Text variant="bodySmall" color="mutedForeground" style={styles.empty}>
            {t('ask.empty')}
          </Text>
        }
        renderItem={({ item }) => <MessageTurn message={item} />}
        ListFooterComponent={
          pendingQuestion ? (
            <View style={styles.footer}>
              <View style={[styles.bubble, styles.userBubble, { backgroundColor: colors.primary, opacity: 0.7 }]}>
                <Text style={{ color: colors.primaryForeground }}>{pendingQuestion}</Text>
              </View>
              <View style={styles.thinking}>
                <ActivityIndicator size="small" color={colors.mutedForeground} />
                <Text variant="caption" color="mutedForeground">
                  {t('ask.thinking')}
                </Text>
              </View>
            </View>
          ) : null
        }
      />

      <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {inlineError ? (
          <Text variant="caption" color="destructive" accessibilityRole="alert">
            {inlineError}
          </Text>
        ) : null}
        {isOffline ? (
          <Text variant="caption" color="warning">
            {t('offline.actionDisabled')}
          </Text>
        ) : null}
        <View style={styles.inputRow}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder={t('ask.placeholder')}
            placeholderTextColor={colors.mutedForeground}
            accessibilityLabel={t('ask.placeholder')}
            multiline
            editable={!askAi.isPending}
            style={[
              styles.input,
              typography.body,
              { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.send')}
            accessibilityState={{ disabled: !canSend }}
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.send, { backgroundColor: colors.primary, opacity: canSend ? 1 : 0.4 }]}
          >
            {askAi.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Icon name="send" size={18} color={colors.primaryForeground} />}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

function extractToolNames(toolCalls: unknown): string[] {
  if (!Array.isArray(toolCalls)) return []
  return toolCalls
    .map((entry) => (entry && typeof entry === 'object' && 'tool' in entry ? String((entry as { tool: unknown }).tool) : null))
    .filter((name): name is string => !!name)
}

function MessageTurn({ message }: { message: AiMessageDto }) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const isUser = message.role === AiMessageRole.User
  const toolNames = extractToolNames(message.toolCalls)

  return (
    <View style={[styles.turn, isUser ? styles.alignEnd : styles.alignStart]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.primary }]
            : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}
      >
        <Text style={isUser ? { color: colors.primaryForeground } : undefined} selectable>
          {message.content}
        </Text>
      </View>

      {!isUser && message.status === AiMessageStatus.Failed ? (
        <Text variant="caption" color="destructive">
          {message.errorMessage ?? t('ask.failedAnswer')}
        </Text>
      ) : null}

      {!isUser && toolNames.length > 0 ? (
        <View style={styles.toolsRow}>
          <Icon name="construct-outline" size={12} color={colors.mutedForeground} />
          <Text variant="caption" color="mutedForeground">
            {t('ask.toolsUsed', { tools: toolNames.join(', ') })}
          </Text>
        </View>
      ) : null}

      {!isUser && message.facts != null ? (
        <View style={[styles.sources, { borderColor: colors.border, backgroundColor: colors.muted }]}>
          <Text variant="overline" color="mutedForeground">
            {t('ask.sources')}
          </Text>
          <JsonDataView data={message.facts} />
        </View>
      ) : null}

      <Text variant="caption" color="mutedForeground">
        {formatDateTime(message.createdAt)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: spacing.lg },
  list: { padding: spacing.lg, gap: spacing.lg },
  empty: { textAlign: 'center', marginTop: spacing.xxxl },
  turn: { gap: spacing.xs, maxWidth: '100%' },
  alignEnd: { alignItems: 'flex-end' },
  alignStart: { alignItems: 'flex-start' },
  bubble: { maxWidth: '88%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  userBubble: { borderBottomEndRadius: radius.sm },
  assistantBubble: { borderWidth: StyleSheet.hairlineWidth, borderBottomStartRadius: radius.sm },
  toolsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sources: { width: '88%', borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.sm, gap: spacing.xs },
  footer: { alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' },
  inputBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.xs },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
})
