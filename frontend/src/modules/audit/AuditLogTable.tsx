import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import type { AuditLogDto } from '@/types/api'
import { useAuditLogs } from './api'

export function AuditLogTable({ basePath }: { basePath?: string }) {
  const [page, setPage] = useState(1)
  const [module, setModule] = useState('')
  const [expanded, setExpanded] = useState<AuditLogDto | null>(null)

  const { data, isLoading, isError, refetch } = useAuditLogs(page, { module: module || undefined }, basePath)
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Filter by module (e.g. Users, Organizations, Auth)…"
          className="max-w-xs"
          value={module}
          onChange={(e) => {
            setModule(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {isLoading && <LoadingState label="Loading audit logs…" />}
      {isError && <ErrorState message="Could not load audit logs." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No activity yet" description="Actions taken in this organization will appear here." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((log) => (
                <TableRow key={log.id} className="cursor-pointer" onClick={() => setExpanded(log)}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
                  <TableCell>{log.userEmail ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{log.module}</Badge>
                  </TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.entityType}
                    {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.ipAddress ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} events
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setExpanded(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-base font-semibold">
              {expanded.action} — {expanded.entityType}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="mb-1 font-medium text-muted-foreground">Before</p>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                  {expanded.beforeJson ? JSON.stringify(JSON.parse(expanded.beforeJson), null, 2) : '—'}
                </pre>
              </div>
              <div>
                <p className="mb-1 font-medium text-muted-foreground">After</p>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                  {expanded.afterJson ? JSON.stringify(JSON.parse(expanded.afterJson), null, 2) : '—'}
                </pre>
              </div>
            </div>
            <Button variant="outline" className="mt-4" onClick={() => setExpanded(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
