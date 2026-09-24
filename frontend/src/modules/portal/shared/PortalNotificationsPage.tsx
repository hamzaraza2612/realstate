import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/portalApiClient'
import { cn, formatDate } from '@/lib/utils'
import { NotificationCategoryLabel } from '@/types/api'
import type { PortalCommonApi } from './portalCommon'

/** Shared across all five portal areas — see `createPortalCommonApi`. */
export function PortalNotificationsPage({
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
}: Pick<PortalCommonApi, 'useNotifications' | 'useMarkNotificationRead' | 'useMarkAllNotificationsRead'>) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useNotifications(page, {})
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  async function handleMarkAllRead() {
    try {
      await markAllRead.mutateAsync()
    } catch (error) {
      toast({ title: 'Could not mark notifications as read', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleClick(id: string, isRead: boolean) {
    if (isRead) return
    try {
      await markRead.mutateAsync(id)
    } catch (error) {
      toast({ title: 'Could not mark notification as read', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates about your account."
        actions={
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
            Mark all read
          </Button>
        }
      />

      {isLoading && <LoadingState label="Loading notifications…" />}
      {isError && <ErrorState message="Could not load notifications." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No notifications yet" />}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            {data.items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n.id, n.isRead)}
                className={cn(
                  'flex flex-col gap-1 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent',
                  !n.isRead && 'border-primary/40 bg-primary/5',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    <span className={cn('text-sm', !n.isRead && 'font-semibold')}>{n.title}</span>
                  </div>
                  <Badge variant="secondary">{NotificationCategoryLabel[n.category]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} notifications
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
    </div>
  )
}
