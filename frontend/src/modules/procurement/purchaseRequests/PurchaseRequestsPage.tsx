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
import { PurchasePriority, PurchasePriorityLabel, PurchaseRequestStatus, PurchaseRequestStatusLabel } from '@/types/api'
import { usePurchaseRequests } from './api'
import { PurchaseRequestFormDialog } from './PurchaseRequestFormDialog'

const ALL = 'all'

const statusVariant: Record<PurchaseRequestStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [PurchaseRequestStatus.Draft]: 'secondary',
  [PurchaseRequestStatus.Submitted]: 'outline',
  [PurchaseRequestStatus.Approved]: 'success',
  [PurchaseRequestStatus.Rejected]: 'destructive',
  [PurchaseRequestStatus.Cancelled]: 'destructive',
}

const priorityVariant: Record<PurchasePriority, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [PurchasePriority.Low]: 'outline',
  [PurchasePriority.Medium]: 'secondary',
  [PurchasePriority.High]: 'destructive',
}

export function PurchaseRequestsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, refetch } = usePurchaseRequests(page, {
    status: status === ALL ? undefined : (Number(status) as PurchaseRequestStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Purchase Requests"
        description="Requests for materials and services, routed for approval before ordering."
        actions={
          <PermissionGate permission="procurement.request.create">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New request
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
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(PurchaseRequestStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading purchase requests…" />}
      {isError && <ErrorState message="Could not load purchase requests." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No purchase requests found" description="Try different filters or create your first request." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Requested by</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Estimated total</TableHead>
                <TableHead>Required by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((pr) => (
                <TableRow key={pr.id} className="cursor-pointer" onClick={() => navigate(`/procurement/purchase-requests/${pr.id}`)}>
                  <TableCell className="font-medium">{pr.requestNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{pr.projectName}</TableCell>
                  <TableCell className="text-muted-foreground">{pr.requestedByUserName ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[pr.priority]}>{PurchasePriorityLabel[pr.priority]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[pr.status]}>{PurchaseRequestStatusLabel[pr.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">${pr.estimatedTotal.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{pr.requiredDate ? formatDate(pr.requiredDate) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} requests
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

      <PurchaseRequestFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
