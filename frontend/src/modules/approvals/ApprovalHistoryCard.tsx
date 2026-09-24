import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { ApprovalStatus, ApprovalStatusLabel } from '@/types/api'
import { useEntityApprovals } from './api'

const statusVariant: Record<ApprovalStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [ApprovalStatus.Pending]: 'outline',
  [ApprovalStatus.Approved]: 'success',
  [ApprovalStatus.Rejected]: 'destructive',
  [ApprovalStatus.Cancelled]: 'secondary',
}

export function ApprovalHistoryCard({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { data: approvals, isLoading, isError, refetch } = useEntityApprovals(entityType, entityId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval history</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading approval history…" />}
        {isError && <ErrorState message="Could not load approval history." onRetry={() => refetch()} />}
        {!isLoading && !isError && (approvals?.length ?? 0) === 0 && (
          <EmptyState title="No approval requests" description="This record has never required approval." />
        )}
        {!isLoading && !isError && approvals && approvals.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Requested by</TableHead>
                <TableHead>Decided by</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Decided</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell>
                    <Badge variant={statusVariant[approval.status]}>{ApprovalStatusLabel[approval.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{approval.requestedByUserName ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{approval.decidedByUserName ?? '—'}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {approval.decisionComments ?? approval.requestComments ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(approval.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{approval.decidedAt ? formatDate(approval.decidedAt) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
