import { apiClient } from '@/lib/apiClient'

/**
 * Downloads a report as CSV. Report endpoints are authenticated GETs, so a plain
 * `<a href>` can't carry the bearer token — this fetches the file as a blob through
 * `apiClient` (same pattern as `modules/documents/api.ts`'s `downloadDocument`) and
 * triggers a browser save.
 */
export async function exportReportCsv(url: string, params: object | undefined, fileName: string) {
  const response = await apiClient.get(url, {
    params: { ...params, format: 'csv' },
    responseType: 'blob',
  })
  const blobUrl = window.URL.createObjectURL(response.data as Blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}
