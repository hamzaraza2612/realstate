import { Platform } from 'react-native'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Directory, File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { portalApiClient } from '@/api/portalApiClient'
import type { ApiEnvelope, NotificationDto } from '@/types/api'
import type { DocumentDto } from '@/types/modules'
import type { PortalArea } from '../areas'
import { PORTAL_KEY, usePortalGet, usePortalPagedList } from './portalQueries'

/**
 * The documents + notifications surface every portal area exposes with an identical shape
 * (mirrors the web `modules/portal/shared/portalCommon.ts` factory), parameterized by the area's own
 * prefix — `GET {prefix}/documents`, `GET {prefix}/documents/{id}/download`,
 * `GET {prefix}/notifications`, `GET {prefix}/notifications/unread-count`,
 * `POST {prefix}/notifications/{id}/read`, `POST {prefix}/notifications/read-all`.
 *
 * Portal documents are read-only and per-actor: the backend returns the documents attached to the
 * caller's OWN records (ownership-checked server-side). There is no portal upload endpoint, so the
 * internal Documents feature (generic `/documents?entityType=&entityId=` + upload) is never used here.
 */

export function areaKey(area: PortalArea) {
  return [...PORTAL_KEY, area.slug] as const
}

/** `GET {prefix}/documents` — the backend returns a plain list (not a `PagedResult`); it is already
 * bounded server-side (each owned record's documents, first 100 per record). */
export function usePortalDocuments(area: PortalArea) {
  return usePortalGet<DocumentDto[]>([...areaKey(area), 'documents'], `${area.apiPrefix}/documents`)
}

function fileNameFromContentDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header)
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''))
    } catch {
      // fall through to the plain filename=
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain ? plain[1].trim() : null
}

function safeFileName(name: string): string {
  const cleaned = name.replace(/[/\\?%*:|"<>]/g, '_').trim()
  return cleaned || 'document'
}

/**
 * Downloads the latest version of one of the caller's documents through `portalApiClient`, so an
 * expired portal access token is refreshed by the normal interceptor first. The real file name and
 * content type come from the server's `Content-Disposition` / `Content-Type` headers.
 *  - web: handed to the browser as a download (like the web portal);
 *  - iOS/Android: written into the app cache with `expo-file-system`, then the OS share / "Open in…"
 *    sheet is opened with `expo-sharing` (same pattern as the internal Documents feature).
 */
export async function openPortalDocument(area: PortalArea, document: DocumentDto): Promise<void> {
  const url = `${area.apiPrefix}/documents/${document.id}/download`

  if (Platform.OS === 'web') {
    const response = await portalApiClient.get<Blob>(url, { responseType: 'blob' })
    const fileName = safeFileName(fileNameFromContentDisposition(response.headers['content-disposition']) ?? document.title)
    const objectUrl = window.URL.createObjectURL(response.data)
    const link = window.document.createElement('a')
    link.href = objectUrl
    link.download = fileName
    window.document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(objectUrl)
    return
  }

  const response = await portalApiClient.get<ArrayBuffer>(url, { responseType: 'arraybuffer' })
  const fileName = safeFileName(fileNameFromContentDisposition(response.headers['content-disposition']) ?? document.title)
  const contentType = typeof response.headers['content-type'] === 'string' ? response.headers['content-type'] : undefined
  const directory = new Directory(Paths.cache, 'portal-documents', document.id)
  directory.create({ intermediates: true, idempotent: true })
  const file = new File(directory, fileName)
  if (file.exists) file.delete()
  file.create()
  file.write(new Uint8Array(response.data))
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('sharing_unavailable')
  }
  await Sharing.shareAsync(file.uri, { mimeType: contentType, dialogTitle: document.title })
}

/**
 * The server's own reason for a rejected portal request: an ASP.NET model-validation problem's
 * per-field `errors` (e.g. "The Description field is required."), else the `{ title }` the portal
 * services return (e.g. "This lease is no longer active."), else the caller's fallback.
 */
export function portalErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { title?: string; error?: string; errors?: Record<string, string[] | string> } | undefined
    if (data?.errors && typeof data.errors === 'object') {
      const messages = Object.values(data.errors).flatMap((value) => (Array.isArray(value) ? value : [value])).filter(Boolean)
      if (messages.length > 0) return messages.join('\n')
    }
    return data?.title ?? data?.error ?? fallback
  }
  return fallback
}

// --- Notifications ---

function notificationsKey(area: PortalArea) {
  return [...areaKey(area), 'notifications'] as const
}

export function usePortalNotifications(area: PortalArea, unreadOnly: boolean) {
  return usePortalPagedList<NotificationDto>(notificationsKey(area), `${area.apiPrefix}/notifications`, { unreadOnly: unreadOnly || undefined })
}

export function usePortalUnreadCount(area: PortalArea) {
  return useQuery({
    queryKey: [...notificationsKey(area), 'unread-count'],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<number>>(`${area.apiPrefix}/notifications/unread-count`)
      return response.data.data
    },
    refetchInterval: 60_000,
  })
}

export function useMarkPortalNotificationRead(area: PortalArea) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await portalApiClient.post<ApiEnvelope<NotificationDto>>(`${area.apiPrefix}/notifications/${id}/read`)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey(area) }),
  })
}

export function useMarkAllPortalNotificationsRead(area: PortalArea) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await portalApiClient.post(`${area.apiPrefix}/notifications/read-all`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey(area) }),
  })
}
