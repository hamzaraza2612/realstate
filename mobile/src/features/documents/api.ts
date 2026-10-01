import { Platform } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Directory, File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { apiClient } from '@/api/apiClient'
import { usePagedList } from '@/api/paging'
import { internalSessionStore } from '@/auth/stores'
import { API_BASE_URL } from '@/config'
import type { ApiEnvelope } from '@/types/api'
import type { DocumentCategory, DocumentDto, DocumentVersionDto } from '@/types/modules'
import { appendFile, type PickedFile } from '@/utils/filePicking'

/**
 * Documents attached to one record — the existing Documents API, unchanged:
 *   GET  /documents?entityType=&entityId=&page=&pageSize=   (documents.view)
 *   POST /documents  multipart: EntityType, EntityId, Category, Title, Description, File  (documents.manage)
 *   GET  /documents/{id}            → { document, versions }   (documents.view)
 *   GET  /documents/{id}/download   → the latest version's bytes (documents.view)
 * File type / size / magic-byte / storage-quota checks all stay server-side (DocumentService);
 * the app only shows the server's error message when it rejects an upload.
 */

export const DOCUMENTS_KEY = ['documents']

export function useEntityDocuments(entityType: string, entityId: string | undefined, enabled = true) {
  return usePagedList<DocumentDto>([...DOCUMENTS_KEY, 'entity', entityType, entityId], '/documents', { entityType, entityId }, { enabled: enabled && !!entityId })
}

export interface UploadDocumentInput {
  entityType: string
  entityId: string
  category: DocumentCategory
  title: string
  description: string
  file: PickedFile
}

export function useUploadDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UploadDocumentInput) => {
      const form = new FormData()
      form.append('EntityType', input.entityType)
      form.append('EntityId', input.entityId)
      form.append('Category', String(input.category))
      form.append('Title', input.title)
      form.append('Description', input.description)
      appendFile(form, 'File', input.file)
      // axios drops its JSON Content-Type for FormData on web and React Native, letting the platform
      // set `multipart/form-data; boundary=…` itself.
      const response = await apiClient.post<ApiEnvelope<DocumentDto>>('/documents', form)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  })
}

function safeFileName(name: string): string {
  const cleaned = name.replace(/[/\\?%*:|"<>]/g, '_').trim()
  return cleaned || 'document'
}

/**
 * Opens the latest version of a document.
 *
 * Step 1 is an ordinary `apiClient` call (`GET /documents/{id}`), which refreshes an expired access
 * token through the normal interceptor and returns the version's real file name and content type.
 * Then:
 *  - web: the bytes are fetched as a Blob and handed to the browser as a download (like the web app);
 *  - iOS/Android: `expo-file-system` downloads the file into the app cache with the bearer token,
 *    and `expo-sharing` opens the OS share / "Open in…" sheet for it.
 */
export async function openDocument(document: DocumentDto): Promise<void> {
  const detail = await apiClient.get<ApiEnvelope<{ document: DocumentDto; versions: DocumentVersionDto[] }>>(`/documents/${document.id}`)
  const latest = detail.data.data.versions.find((v) => v.versionNumber === detail.data.data.document.latestVersionNumber) ?? detail.data.data.versions[0]
  const fileName = safeFileName(latest?.originalFileName ?? document.title)

  if (Platform.OS === 'web') {
    const response = await apiClient.get<Blob>(`/documents/${document.id}/download`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(response.data)
    const link = window.document.createElement('a')
    link.href = url
    link.download = fileName
    window.document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    return
  }

  const token = internalSessionStore.getState().session?.accessToken
  const directory = new Directory(Paths.cache, 'documents', document.id)
  directory.create({ intermediates: true, idempotent: true })
  const file = await File.downloadFileAsync(`${API_BASE_URL}/documents/${document.id}/download`, new File(directory, fileName), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    idempotent: true,
  })
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('sharing_unavailable')
  }
  await Sharing.shareAsync(file.uri, { mimeType: latest?.contentType, dialogTitle: document.title })
}
