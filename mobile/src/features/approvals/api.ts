import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import type { ApiEnvelope, ApprovalRequestDto, ApprovalStatus, Paged, PageMeta } from '@/types/api'

/**
 * Approval Inbox — port of the web `frontend/src/modules/approvals/api.ts`. This is the SAME
 * approval system AI action proposals are decided through (via their `approvalRequestId`).
 */

export const APPROVALS_KEY = ['approvals']

/** Omitting `status` returns only Pending requests — the default "my inbox" view. */
export function useApprovalInbox(page: number, status?: ApprovalStatus, pageSize = 20) {
  return useQuery({
    queryKey: [...APPROVALS_KEY, 'inbox', page, status, pageSize],
    queryFn: async (): Promise<Paged<ApprovalRequestDto>> => {
      const response = await apiClient.get<ApiEnvelope<ApprovalRequestDto[]>>('/approvals/inbox', {
        params: { page, pageSize, status },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

/** Pending count for the Home tile / tab badge — page 1 with pageSize 1, reading `meta.total`. */
export function usePendingApprovalCount() {
  const query = useApprovalInbox(1, undefined, 1)
  return { ...query, count: query.data?.meta?.total }
}

/**
 * One request. `GET /approvals/{id}` requires `approvals.view`, which a named approver may not
 * hold — so the detail screen is seeded from the inbox row already in cache (`initialData`) and
 * only refetches from the server when the user has that permission.
 */
export function useApprovalRequest(id: string | undefined, options: { canFetch: boolean; seed?: ApprovalRequestDto }) {
  return useQuery({
    queryKey: [...APPROVALS_KEY, 'detail', id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ApprovalRequestDto>>(`/approvals/${id}`)
      return response.data.data
    },
    enabled: !!id && options.canFetch,
    initialData: options.seed,
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
    onSuccess: (updated) => {
      queryClient.setQueryData([...APPROVALS_KEY, 'detail', updated.id], updated)
      queryClient.invalidateQueries({ queryKey: APPROVALS_KEY })
      // A decided request may be an AI action proposal's approval.
      queryClient.invalidateQueries({ queryKey: ['ai'] })
    },
  })
}
