import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { AccountTypeLabel } from '@/types/api'
import { useTrialBalance } from './api'

export function TrialBalancePage() {
  const { data, isLoading, isError, refetch } = useTrialBalance()

  if (isLoading) return <LoadingState label="Loading trial balance…" />
  if (isError || !data) return <ErrorState message="Could not load the trial balance." onRetry={() => refetch()} />

  const reconciles = data.totalDebit === data.totalCredit

  return (
    <div>
      <PageHeader title="Trial Balance" description="Posted account balances as of now." />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Account balances</CardTitle>
          <Badge variant={reconciles ? 'success' : 'destructive'}>{reconciles ? 'Reconciles' : 'Does not reconcile'}</Badge>
        </CardHeader>
        <CardContent>
          {data.lines.length === 0 ? (
            <EmptyState title="No posted activity yet" description="Once journal entries are posted, balances appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lines.map((line) => (
                  <TableRow key={line.accountId}>
                    <TableCell className="font-medium">{line.code}</TableCell>
                    <TableCell>{line.name}</TableCell>
                    <TableCell className="text-muted-foreground">{AccountTypeLabel[line.type]}</TableCell>
                    <TableCell className="text-right">{line.totalDebit > 0 ? `$${line.totalDebit.toLocaleString()}` : ''}</TableCell>
                    <TableCell className="text-right">{line.totalCredit > 0 ? `$${line.totalCredit.toLocaleString()}` : ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">${data.totalDebit.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${data.totalCredit.toLocaleString()}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
