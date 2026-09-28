import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type {
  AiActionProposalDto,
  AiActionProposalStatus,
  AiConversationDto,
  AiConversationSummaryDto,
  AiMessageDto,
  ApiEnvelope,
  CommandCenterSummaryDto,
  PageMeta,
} from '@/types/api'

/** Milestone 16 — AI Business Intelligence / Business Command Center. Every endpoint here lives
 * under `/ai/*`, is gated server-side by the tenant's "ai" plan entitlement (403 `feature_not_entitled`
 * when the plan doesn't include it) and by the `ai.view` permission — see
 * backend/src/Api/Controllers/{CommandCenterController,AiConversationsController,AiActionProposalsController}.cs.
 * Approving/rejecting a proposal reuses the EXISTING Approval Inbox (`useDecideApproval` in
 * `modules/approvals/api.ts`) — there is no separate decide endpoint here. */

const AI_KEY = ['ai']
const COMMAND_CENTER_SUMMARY_KEY = [...AI_KEY, 'command-center', 'summary']
const AI_CONVERSATIONS_KEY = [...AI_KEY, 'conversations']
const AI_ACTION_PROPOSALS_KEY = [...AI_KEY, 'action-proposals']

/** The three failure codes the Command Center UI must recognize and explain in place, rather than
 * showing a generic error toast — see the controllers' docstrings and docs/AI_ARCHITECTURE.md. */
export type AiErrorCode = 'feature_not_entitled' | 'ai_provider_not_configured' | 'ai_rate_limited'

export function getAiErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { code?: string } | undefined)?.code
  }
  return undefined
}

export function useCommandCenterSummary() {
  return useQuery({
    queryKey: COMMAND_CENTER_SUMMARY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CommandCenterSummaryDto>>('/ai/command-center/summary')
      return response.data.data
    },
    retry: (failureCount, error) => getAiErrorCode(error) !== 'feature_not_entitled' && failureCount < 2,
  })
}

export function useAiConversations(page: number) {
  return useQuery({
    queryKey: [...AI_CONVERSATIONS_KEY, 'list', page],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<AiConversationSummaryDto[]>>('/ai/conversations', {
        params: { page, pageSize: 20 },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
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
  })
}

export function useAiActionProposals(page: number, status?: AiActionProposalStatus) {
  return useQuery({
    queryKey: [...AI_ACTION_PROPOSALS_KEY, 'list', page, status],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<AiActionProposalDto[]>>('/ai/action-proposals', {
        params: { page, pageSize: 20, status },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAiActionProposal(id: string | undefined) {
  return useQuery({
    queryKey: [...AI_ACTION_PROPOSALS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<AiActionProposalDto>>(`/ai/action-proposals/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}
