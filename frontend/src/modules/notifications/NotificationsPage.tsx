import { Settings } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { cn, formatDate } from '@/lib/utils'
import { NotificationCategory, NotificationCategoryLabel } from '@/types/api'
import { resolveNotificationLink, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from './api'

const ALL = 'all'
const UNREAD = 'unread'

export function NotificationsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [readFilter, setReadFilter] = useState<string>(ALL)
  const [category, setCategory] = useState<string>(ALL)

  const { data, isLoading, isError, refetch } = useNotifications(page, {
    unreadOnly: readFilter === UNREAD ? true : undefined,
    category: category === ALL ? undefined : (Number(category) as NotificationCategory),
  })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  async function handleMarkAllRead() {
    try {
      await markAllRead.mutateAsync()
      toast({ title: 'All notifications marked as read', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not mark notifications as read', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleRowClick(id: string, isRead: boolean, entityType: string | null, entityId: string | null) {
    if (!isRead) {
      try {
        await markRead.mutateAsync(id)
      } catch (error) {
        toast({ title: 'Could not mark as read', description: extractErrorMessage(error), variant: 'destructive' })
      }
    }
    const link = resolveNotificationLink(entityType, entityId)
    if (link) navigate(link)
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates about approvals, documents, and other activity relevant to you."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/notifications/preferences')}>
              <Settings className="h-4 w-4" /> Preferences
            </Button>
            <Button onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
              Mark all read
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={readFilter}
          onValueChange={(v) => {
            setReadFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            <SelectItem value={UNREAD}>Unread only</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {Object.entries(NotificationCategoryLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading notifications…" />}
      {isError && <ErrorState message="Could not load notifications." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No notifications" description="You're all caught up." />}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Title</TableHead>
                <TableHead>Body</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((n) => (
                <TableRow
                  key={n.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(n.id, n.isRead, n.entityType, n.entityId)}
                >
                  <TableCell>{!n.isRead && <span className="block h-2 w-2 rounded-full bg-primary" aria-label="Unread" />}</TableCell>
                  <TableCell className={cn('font-medium', !n.isRead && 'font-semibold')}>{n.title}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">{n.body}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{NotificationCategoryLabel[n.category]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(n.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

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
