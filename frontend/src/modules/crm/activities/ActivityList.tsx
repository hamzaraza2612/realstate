import { Check, Phone, StickyNote, Users as UsersIcon, CalendarClock, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { ActivityType, ActivityTypeLabel, ActivityStatus } from '@/types/api'
import { useActivities, useCompleteActivity, useDeleteActivity } from './api'
import { PermissionGate } from '@/components/common/PermissionGate'

const activityIcons: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  [ActivityType.Call]: Phone,
  [ActivityType.Meeting]: UsersIcon,
  [ActivityType.Note]: StickyNote,
  [ActivityType.FollowUp]: CalendarClock,
}

export function ActivityList({ leadId, customerId }: { leadId?: string; customerId?: string }) {
  const { data, isLoading, isError, refetch } = useActivities({ leadId, customerId })
  const complete = useCompleteActivity()
  const remove = useDeleteActivity()

  async function handleComplete(id: string) {
    try {
      await complete.mutateAsync(id)
      toast({ title: 'Activity marked complete', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not complete activity', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove.mutateAsync(id)
      toast({ title: 'Activity deleted', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not delete activity', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading activity…" />
  if (isError) return <ErrorState message="Could not load activity." onRetry={() => refetch()} />
  if (!data || data.items.length === 0) {
    return <EmptyState title="No activity yet" description="Log a call, meeting, note, or follow-up to get started." />
  }

  const isOverdue = (dueDate: string | null, status: number) =>
    status === ActivityStatus.Pending && dueDate !== null && new Date(dueDate) < new Date()

  return (
    <div className="flex flex-col gap-3">
      {data.items.map((activity) => {
        const Icon = activityIcons[activity.type]
        return (
          <div key={activity.id} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{activity.subject}</p>
                <Badge variant="secondary">{ActivityTypeLabel[activity.type]}</Badge>
                {activity.status === ActivityStatus.Completed ? (
                  <Badge variant="success">Completed</Badge>
                ) : isOverdue(activity.dueDate, activity.status) ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </div>
              {activity.description && <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {activity.dueDate && <>Due {formatDate(activity.dueDate)} · </>}
                {activity.assignedToUserName && <>{activity.assignedToUserName} · </>}
                Logged {formatDate(activity.createdAt)}
              </p>
            </div>
            <PermissionGate permission="crm.activity.manage">
              <div className="flex shrink-0 gap-1">
                {activity.status === ActivityStatus.Pending && (
                  <Button variant="ghost" size="icon" title="Mark complete" onClick={() => handleComplete(activity.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(activity.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </PermissionGate>
          </div>
        )
      })}
    </div>
  )
}
