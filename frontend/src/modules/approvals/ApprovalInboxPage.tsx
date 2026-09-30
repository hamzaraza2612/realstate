import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { ApprovalStatus, ApprovalStatusLabel, type ApprovalRequestDto } from '@/types/api'
import { useApprovalInbox, useDecideApproval } from './api'

const PENDING = 'pending'

export function ApprovalInboxPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<string>(PENDING)
  const [decisionTarget, setDecisionTarget] = useState<{ request: ApprovalRequestDto; approve: boolean } | null>(null)

  const statusParam = filter === PENDING ? undefined : (Number(filter) as ApprovalStatus)
  const { data, isLoading, isError, refetch } = useApprovalInbox(page, statusParam)

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader title="Approval inbox" description="Requests waiting on your decision, and your past decisions." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={filter}
          onValueChange={(v) => {
            setFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PENDING}>Pending (my inbox)</SelectItem>
            <SelectItem value={String(ApprovalStatus.Approved)}>Approved</SelectItem>
            <SelectItem value={String(ApprovalStatus.Rejected)}>Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading approval requests…" />}
      {isError && <ErrorState message="Could not load approval requests." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="Nothing here" description="No approval requests match this filter." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Requested by</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Requested at</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.entityType} · {request.entityId.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{request.requestedByUserName ?? '—'}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{request.requestComments ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(request.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={request.status} labels={ApprovalStatusLabel} />
                  </TableCell>
                  <TableCell>
                    {request.status === ApprovalStatus.Pending && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDecisionTarget({ request, approve: false })}>
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => setDecisionTarget({ request, approve: true })}>
                          Approve
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="requests" onPageChange={setPage} />
        </>
      )}

      <DecisionDialog
        target={decisionTarget}
        onOpenChange={(open) => !open && setDecisionTarget(null)}
        onDecided={() => refetch()}
      />
    </div>
  )
}

function DecisionDialog({
  target,
  onOpenChange,
  onDecided,
}: {
  target: { request: ApprovalRequestDto; approve: boolean } | null
  onOpenChange: (open: boolean) => void
  onDecided: () => void
}) {
  const decideApproval = useDecideApproval()
  const [comments, setComments] = useState('')

  function handleOpenChange(open: boolean) {
    if (!open) setComments('')
    onOpenChange(open)
  }

  async function handleConfirm() {
    if (!target) return
    try {
      await decideApproval.mutateAsync({ id: target.request.id, approve: target.approve, decisionComments: comments || null })
      toast({ title: target.approve ? 'Request approved' : 'Request rejected', variant: 'success' })
      handleOpenChange(false)
    } catch (error) {
      toast({
        title: target.approve ? 'Could not approve request' : 'Could not reject request',
        description: extractErrorMessage(error),
        variant: 'destructive',
      })
      onDecided()
      handleOpenChange(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target?.approve ? 'Approve request' : 'Reject request'}</DialogTitle>
          <DialogDescription>
            {target?.approve
              ? `This approves the ${target.request.entityType} request from ${target.request.requestedByUserName ?? 'the requester'}.`
              : `This rejects the ${target?.request.entityType} request from ${target?.request.requestedByUserName ?? 'the requester'}. This is a real business decision and cannot be undone from here.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Textarea
            placeholder="Decision comments (optional)"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={target?.approve ? 'default' : 'destructive'} onClick={handleConfirm} disabled={decideApproval.isPending}>
            {decideApproval.isPending ? 'Please wait…' : target?.approve ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
