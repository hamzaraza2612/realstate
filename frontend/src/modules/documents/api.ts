import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, DocumentCategory, DocumentDto, DocumentVersionDto, PageMeta } from '@/types/api'

const DOCUMENTS_KEY = ['documents']

export interface DocumentBrowseFilters {
  category?: DocumentCategory
  search?: string
}

/** Documents attached to one specific entity (e.g. a Customer, Booking, Purchase Order). */
export function useDocuments(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, 'entity', entityType, entityId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<DocumentDto[]>>('/documents', {
        params: { entityType, entityId, page: 1, pageSize: 100 },
      })
      return response.data.data
    },
    enabled: !!entityId,
  })
}

/** Cross-entity document browser (no entityType filter) used by the standalone Documents page. */
export function useDocumentsBrowse(page: number, filters: DocumentBrowseFilters) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, 'browse', page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<DocumentDto[]>>('/documents', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<{ document: DocumentDto; versions: DocumentVersionDto[] }>>(`/documents/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

function invalidateDocuments(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY })
}

export interface UploadDocumentRequest {
  entityType: string
  entityId: string
  category: DocumentCategory
  title: string
  description: string
  file: File
}

export function useUploadDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UploadDocumentRequest) => {
      const formData = new FormData()
      formData.append('EntityType', payload.entityType)
      formData.append('EntityId', payload.entityId)
      formData.append('Category', String(payload.category))
      formData.append('Title', payload.title)
      formData.append('Description', payload.description)
      formData.append('File', payload.file)
      const response = await apiClient.post<ApiEnvelope<DocumentDto>>('/documents', formData)
      return response.data.data
    },
    onSuccess: () => invalidateDocuments(queryClient),
  })
}

export function useAddDocumentVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData()
      formData.append('File', file)
      const response = await apiClient.post<ApiEnvelope<DocumentVersionDto>>(`/documents/${id}/versions`, formData)
      return response.data.data
    },
    onSuccess: () => invalidateDocuments(queryClient),
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/documents/${id}`)
    },
    onSuccess: () => invalidateDocuments(queryClient),
  })
}

function fileNameFromContentDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header)
  return match ? decodeURIComponent(match[1]) : null
}

/** Imperative download helper — fetches the file as a blob and triggers a browser save. */
export async function downloadDocument(id: string, version?: number, fileName?: string) {
  const response = await apiClient.get(`/documents/${id}/download`, {
    params: version ? { version } : undefined,
    responseType: 'blob',
  })
  const blobUrl = window.URL.createObjectURL(response.data as Blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileName ?? fileNameFromContentDisposition(response.headers['content-disposition']) ?? 'document'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}
