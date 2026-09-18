import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, JournalEntryDto, JournalEntryStatus, PageMeta } from '@/types/api'

const JOURNAL_KEY = ['finance', 'journal-entries']

export interface JournalEntryFilters {
  status?: JournalEntryStatus
  referenceType?: string
  search?: string
}

export function useJournalEntries(page: number, filters: JournalEntryFilters) {
  return useQuery({
    queryKey: [...JOURNAL_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<JournalEntryDto[]>>('/finance/journal-entries', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useJournalEntry(id: string | undefined) {
  return useQuery({
    queryKey: [...JOURNAL_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<JournalEntryDto>>(`/finance/journal-entries/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface CreateJournalLineRequest {
  accountId: string
  debit: number
  credit: number
  description: string | null
}

export interface CreateJournalEntryRequest {
  entryDate: string
  description: string | null
  lines: CreateJournalLineRequest[]
}

function invalidateJournal(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: JOURNAL_KEY })
  queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] })
  queryClient.invalidateQueries({ queryKey: ['finance', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['finance', 'reports'] })
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateJournalEntryRequest) => {
      const response = await apiClient.post<ApiEnvelope<JournalEntryDto>>('/finance/journal-entries', payload)
      return response.data.data
    },
    onSuccess: () => invalidateJournal(queryClient),
  })
}

function useJournalAction(action: 'post' | 'cancel') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<JournalEntryDto>>(`/finance/journal-entries/${id}/${action}`)
      return response.data.data
    },
    onSuccess: () => invalidateJournal(queryClient),
  })
}

export const usePostJournalEntry = () => useJournalAction('post')
export const useCancelJournalEntry = () => useJournalAction('cancel')
