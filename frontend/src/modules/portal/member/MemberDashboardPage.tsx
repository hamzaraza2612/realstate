import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { MembershipStatus, MembershipStatusLabel } from '@/types/api'
import { useActiveMembership, useUnreadNotificationCount } from './api'

const statusVariant: Record<MembershipStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [MembershipStatus.Active]: 'success',
  [MembershipStatus.Expired]: 'secondary',
  [MembershipStatus.Cancelled]: 'destructive',
}

export function MemberDashboardPage() {
  const { data: membership, isError } = useActiveMembership()
  const { data: unreadCount } = useUnreadNotificationCount()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your membership at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active membership</CardTitle>
          </CardHeader>
          <CardContent>
            {isError || !membership ? (
              <EmptyState title="No active membership" description="You don't have an active membership right now." />
            ) : (
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold">{membership.planName}</p>
                  <Badge variant={statusVariant[membership.status]}>{MembershipStatusLabel[membership.status]}</Badge>
                </div>
                <p className="text-muted-foreground">
                  {formatDate(membership.startDate)} – {formatDate(membership.endDate)}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">${membership.amount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium">${membership.paidAmount.toLocaleString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{unreadCount ?? 0}</p>
            <p className="text-sm text-muted-foreground">unread</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
