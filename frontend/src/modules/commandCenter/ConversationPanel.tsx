import { useEffect, useState } from 'react'
import { Loader2, Plus, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { cn, formatDateTime } from '@/lib/utils'
import { AiMessageRole, AiMessageStatus, type AiMessageDto } from '@/types/api'
import { getAiErrorCode, useAiConversation, useAiConversations, useAskAi, useCreateAiConversation } from './api'
import { JsonDataView } from './JsonDataView'

const AI_ERROR_COPY: Record<string, string> = {
  ai_provider_not_configured: 'AI is not configured for this deployment.',
  ai_rate_limited: 'AI usage limit reached, try again shortly.',
}

/** The "Ask Your Business" panel — a conversation list plus the active conversation's turn-by-turn
 * history. An assistant turn always separates its prose (`content`) from its structured `facts`
 * (rendered as a distinct "Sources" block below the text) — see JsonDataView's docstring for why
 * that separation matters. */
export function ConversationPanel() {
  const { data, isLoading, isError, refetch } = useAiConversations(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const createConversation = useCreateAiConversation()

  const conversations = data?.items ?? []

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id)
    }
  }, [conversations, selectedId])

  async function handleNewConversation() {
    try {
      const conversation = await createConversation.mutateAsync(null)
      setSelectedId(conversation.id)
    } catch (error) {
      const code = getAiErrorCode(error)
      toast({
        title: 'Could not start a new conversation',
        description: code && AI_ERROR_COPY[code] ? AI_ERROR_COPY[code] : undefined,
        variant: 'destructive',
      })
    }
  }

  return (
    <section>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Ask Your Business</CardTitle>
          <Button size="sm" variant="outline" onClick={handleNewConversation} disabled={createConversation.isPending}>
            <Plus className="me-1 h-4 w-4" />
            New conversation
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <LoadingState label="Loading conversations…" />}
          {isError && <ErrorState message="Could not load conversations." onRetry={() => refetch()} />}

          {!isLoading && !isError && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[14rem_1fr]">
              <div className="flex max-h-96 flex-col gap-1 overflow-y-auto md:border-e md:pe-3">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No conversations yet. Start one below.</p>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedId(conversation.id)}
                      className={cn(
                        'flex flex-col items-start rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent',
                        selectedId === conversation.id && 'bg-primary/10 text-primary',
                      )}
                    >
                      <span className="truncate font-medium">{conversation.title}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(conversation.updatedAt)}</span>
                    </button>
                  ))
                )}
              </div>

              <div>
                {selectedId ? (
                  <ActiveConversation conversationId={selectedId} />
                ) : (
                  <EmptyState title="No conversation selected" description="Start a new conversation to ask a question about your business." />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function ActiveConversation({ conversationId }: { conversationId: string }) {
  const { data: conversation, isLoading, isError, refetch } = useAiConversation(conversationId)
  const askAi = useAskAi()
  const [question, setQuestion] = useState('')
  const [inlineError, setInlineError] = useState<string | null>(null)

  if (isLoading) return <LoadingState label="Loading conversation…" />
  if (isError || !conversation) return <ErrorState message="Could not load this conversation." onRetry={() => refetch()} />

  async function handleSend() {
    const trimmed = question.trim()
    if (!trimmed) return
    setInlineError(null)
    try {
      await askAi.mutateAsync({ conversationId, question: trimmed })
      setQuestion('')
    } catch (error) {
      const code = getAiErrorCode(error)
      setInlineError((code && AI_ERROR_COPY[code]) || 'Could not get an answer. Please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pe-1">
        {conversation.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ask a question below to get started.</p>
        ) : (
          conversation.messages.map((message) => <MessageTurn key={message.id} message={message} />)
        )}
      </div>

      <div className="flex flex-col gap-2 border-t pt-3">
        {inlineError && <p className="text-sm text-destructive">{inlineError}</p>}
        <div className="flex gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your business…"
            className="min-h-[2.5rem] flex-1"
            disabled={askAi.isPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button onClick={handleSend} disabled={askAi.isPending || !question.trim()}>
            {askAi.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function MessageTurn({ message }: { message: AiMessageDto }) {
  const isUser = message.role === AiMessageRole.User
  const toolNames = extractToolNames(message.toolCalls)

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[90%] rounded-lg px-3 py-2 text-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'border bg-card',
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      {!isUser && message.status === AiMessageStatus.Failed && (
        <span className="text-xs text-destructive">{message.errorMessage ?? 'This answer could not be completed.'}</span>
      )}

      {!isUser && toolNames.length > 0 && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Wrench className="h-3 w-3" /> used: {toolNames.join(', ')}
        </span>
      )}

      {!isUser && message.facts != null && (
        <div className="w-full max-w-[90%] rounded-md border bg-muted/30 p-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sources</p>
          <JsonDataView data={message.facts} />
        </div>
      )}

      <span className="text-xs text-muted-foreground">{formatDateTime(message.createdAt)}</span>
    </div>
  )
}

function extractToolNames(toolCalls: unknown): string[] {
  if (!Array.isArray(toolCalls)) return []
  return toolCalls
    .map((entry) => (entry && typeof entry === 'object' && 'tool' in entry ? String((entry as { tool: unknown }).tool) : null))
    .filter((name): name is string => !!name)
}
