import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { MembershipStatus, MembershipStatusLabel } from '@/types/api'
import { useMemberships } from './api'
import { MembershipFormDialog } from './MembershipFormDialog'

const ALL = 'all'

const statusVariant: Record<MembershipStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [MembershipStatus.Active]: 'success',
  [MembershipStatus.Expired]: 'secondary',
  [MembershipStatus.Cancelled]: 'destructive',
}

export function MembershipsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()

  const { data, isLoading, isError, refetch } = useMemberships(page, {
    status: status === ALL ? undefined : (Number(status) as MembershipStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Memberships"
        description="Coworking memberships purchased by members."
        actions={
          <PermissionGate permission="facility.coworking.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New membership
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(MembershipStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading memberships…" />}
      {isError && <ErrorState message="Could not load memberships." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No memberships found" description="Create a membership for a coworking member." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((membership) => (
                <TableRow key={membership.id} className="cursor-pointer" onClick={() => navigate(`/facility/coworking/memberships/${membership.id}`)}>
                  <TableCell className="font-medium">{membership.memberName}</TableCell>
                  <TableCell className="text-muted-foreground">{membership.planName}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(membership.startDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(membership.endDate)}</TableCell>
                  <TableCell className="text-right">${membership.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground">${membership.paidAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[membership.status]}>{MembershipStatusLabel[membership.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} memberships
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

      <MembershipFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
