import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, ApprovalRequestDto, ApprovalStatus, PageMeta } from '@/types/api'

const APPROVALS_KEY = ['approvals']

/** Omitting `status` returns only Pending requests — the default "my inbox" view. */
export function useApprovalInbox(page: number, status?: ApprovalStatus) {
  return useQuery({
    queryKey: [...APPROVALS_KEY, 'inbox', page, status],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ApprovalRequestDto[]>>('/approvals/inbox', {
        params: { page, pageSize: 20, status },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useEntityApprovals(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: [...APPROVALS_KEY, 'entity', entityType, entityId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ApprovalRequestDto[]>>('/approvals/entity', {
        params: { entityType, entityId },
      })
      return response.data.data
    },
    enabled: !!entityId,
  })
}

export interface DecideApprovalRequest {
  id: string
  approve: boolean
  decisionComments: string | null
}

export function useDecideApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, approve, decisionComments }: DecideApprovalRequest) => {
      const response = await apiClient.post<ApiEnvelope<ApprovalRequestDto>>(`/approvals/${id}/decide`, {
        approve,
        decisionComments,
      })
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APPROVALS_KEY }),
  })
}
