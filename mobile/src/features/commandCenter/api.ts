import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, extractErrorCode } from '@/api/apiClient'
import type {
  AiActionProposalDto,
  AiConversationDto,
  AiConversationSummaryDto,
  AiMessageDto,
  ApiEnvelope,
  CommandCenterSummaryDto,
  Paged,
  PageMeta,
} from '@/types/api'

/**
 * Milestone 16 Business Command Center — a hook-for-hook port of the web
 * `frontend/src/modules/commandCenter/api.ts` (same endpoints, same query keys, same invalidation).
 * Every endpoint is gated server-side by the tenant's "ai" plan entitlement (403
 * `feature_not_entitled`) and the `ai.view` permission. No AI SDK or key lives in this app: the
 * model is only ever called by the backend. Approving/rejecting a proposal reuses the EXISTING
 * Approval Inbox (`useDecideApproval` in features/approvals/api.ts) — no second decide endpoint.
 */

const AI_KEY = ['ai']
export const COMMAND_CENTER_SUMMARY_KEY = [...AI_KEY, 'command-center', 'summary']
const AI_CONVERSATIONS_KEY = [...AI_KEY, 'conversations']
export const AI_ACTION_PROPOSALS_KEY = [...AI_KEY, 'action-proposals']

/** The failure codes the Command Center UI recognizes and explains in place. */
export type AiErrorCode = 'feature_not_entitled' | 'ai_provider_not_configured' | 'ai_rate_limited'

export const getAiErrorCode = extractErrorCode

export function useCommandCenterSummary(enabled = true) {
  return useQuery({
    queryKey: COMMAND_CENTER_SUMMARY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CommandCenterSummaryDto>>('/ai/command-center/summary')
      return response.data.data
    },
    enabled,
    retry: (failureCount, error) => getAiErrorCode(error) !== 'feature_not_entitled' && failureCount < 2,
  })
}

export function useAiConversations(page: number, enabled = true) {
  return useQuery({
    queryKey: [...AI_CONVERSATIONS_KEY, 'list', page],
    queryFn: async (): Promise<Paged<AiConversationSummaryDto>> => {
      const response = await apiClient.get<ApiEnvelope<AiConversationSummaryDto[]>>('/ai/conversations', {
        params: { page, pageSize: 20 },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    enabled,
    placeholderData: (prev) => prev,
  })
}

export function useAiConversation(id: string | undefined) {
  return useQuery({
    queryKey: [...AI_CONVERSATIONS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<AiConversationDto>>(`/ai/conversations/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useCreateAiConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (title: string | null) => {
      const response = await apiClient.post<ApiEnvelope<AiConversationDto>>('/ai/conversations', { title })
      return response.data.data
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: [...AI_CONVERSATIONS_KEY, 'list'] })
      queryClient.invalidateQueries({ queryKey: COMMAND_CENTER_SUMMARY_KEY })
      queryClient.setQueryData([...AI_CONVERSATIONS_KEY, conversation.id], conversation)
    },
  })
}

export interface AskAiVariables {
  conversationId: string
  question: string
}

export function useAskAi() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, question }: AskAiVariables) => {
      const response = await apiClient.post<ApiEnvelope<AiMessageDto>>(`/ai/conversations/${conversationId}/messages`, { question })
      return response.data.data
    },
    onSuccess: (_message, variables) => {
      queryClient.invalidateQueries({ queryKey: [...AI_CONVERSATIONS_KEY, variables.conversationId] })
      queryClient.invalidateQueries({ queryKey: [...AI_CONVERSATIONS_KEY, 'list'] })
      // A write-tool call mid-conversation may have just created a new pending action proposal.
      queryClient.invalidateQueries({ queryKey: AI_ACTION_PROPOSALS_KEY })
      queryClient.invalidateQueries({ queryKey: COMMAND_CENTER_SUMMARY_KEY })
    },
    onSettled: (_data, _error, variables) => {
      // A model-side failure comes back as a persisted `Failed` assistant turn (AiConversationService),
      // and a request-level failure may still have saved the question — refresh the thread either way.
      queryClient.invalidateQueries({ queryKey: [...AI_CONVERSATIONS_KEY, variables.conversationId] })
    },
  })
}

export function useAiActionProposals(page: number, enabled = true) {
  return useQuery({
    queryKey: [...AI_ACTION_PROPOSALS_KEY, 'list', page],
    queryFn: async (): Promise<Paged<AiActionProposalDto>> => {
      const response = await apiClient.get<ApiEnvelope<AiActionProposalDto[]>>('/ai/action-proposals', {
        params: { page, pageSize: 20 },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    enabled,
    placeholderData: (prev) => prev,
  })
}
