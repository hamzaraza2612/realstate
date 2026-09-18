import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { JournalEntryStatus, JournalEntryStatusLabel } from '@/types/api'
import { useCancelJournalEntry, useJournalEntry, usePostJournalEntry } from './api'

const statusVariant: Record<JournalEntryStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [JournalEntryStatus.Draft]: 'secondary',
  [JournalEntryStatus.Posted]: 'success',
  [JournalEntryStatus.Cancelled]: 'destructive',
}

export function JournalEntryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: entry, isLoading, isError, refetch } = useJournalEntry(id)
  const postEntry = usePostJournalEntry()
  const cancelEntry = useCancelJournalEntry()

  async function handlePost() {
    if (!id) return
    try {
      await postEntry.mutateAsync(id)
      toast({ title: 'Journal entry posted', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not post entry', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleCancel() {
    if (!id) return
    try {
      await cancelEntry.mutateAsync(id)
      toast({ title: 'Journal entry cancelled', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not cancel entry', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading journal entry…" />
  if (isError || !entry) return <ErrorState message="Could not load this journal entry." onRetry={() => refetch()} />

  const isDraft = entry.status === JournalEntryStatus.Draft

  return (
    <div>
      <PageHeader
        title={entry.entryNumber}
        description={`${formatDate(entry.entryDate)} · ${entry.referenceType}${entry.description ? ` · ${entry.description}` : ''}`}
        actions={
          isDraft ? (
            <PermissionGate permission="finance.manage">
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleCancel} disabled={cancelEntry.isPending}>
                  Cancel
                </Button>
                <Button onClick={handlePost} disabled={postEntry.isPending}>
                  Post entry
                </Button>
              </div>
            </PermissionGate>
          ) : undefined
        }
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Lines</CardTitle>
          <Badge variant={statusVariant[entry.status]}>{JournalEntryStatusLabel[entry.status]}</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">
                    {line.accountCode} · {line.accountName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{line.description ?? '—'}</TableCell>
                  <TableCell className="text-right">{line.debit > 0 ? `$${line.debit.toLocaleString()}` : ''}</TableCell>
                  <TableCell className="text-right">{line.credit > 0 ? `$${line.credit.toLocaleString()}` : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-medium">
                  Total
                </TableCell>
                <TableCell className="text-right font-medium">${entry.totalDebit.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">${entry.totalCredit.toLocaleString()}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
