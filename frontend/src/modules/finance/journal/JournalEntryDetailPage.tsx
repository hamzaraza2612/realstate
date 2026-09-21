import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { JournalEntryStatus, JournalEntryStatusLabel } from '@/types/api'
import { useCancelJournalEntry, useJournalEntry, usePostJournalEntry, useReverseJournalEntry } from './api'

const today = () => new Date().toISOString().slice(0, 10)

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
  const reverseEntry = useReverseJournalEntry()

  const [reverseOpen, setReverseOpen] = useState(false)
  const [reversalDate, setReversalDate] = useState(today())
  const [reason, setReason] = useState('')

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

  function openReverseDialog() {
    setReversalDate(today())
    setReason('')
    setReverseOpen(true)
  }

  async function handleReverse() {
    if (!id) return
    try {
      await reverseEntry.mutateAsync({ id, reversalDate: reversalDate || null, reason: reason || null })
      toast({ title: 'Journal entry reversed', variant: 'success' })
      setReverseOpen(false)
    } catch (error) {
      toast({ title: 'Could not reverse entry', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading journal entry…" />
  if (isError || !entry) return <ErrorState message="Could not load this journal entry." onRetry={() => refetch()} />

  const isDraft = entry.status === JournalEntryStatus.Draft
  const canReverse = entry.status === JournalEntryStatus.Posted && !entry.isReversed

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
          ) : canReverse ? (
            <PermissionGate permission="finance.manage">
              <Button variant="destructive" onClick={openReverseDialog}>
                Reverse
              </Button>
            </PermissionGate>
          ) : undefined
        }
      />

      {(entry.isReversed || entry.reversalOfEntryId) && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          {entry.isReversed && <Badge variant="outline">Reversed</Badge>}
          {entry.reversalOfEntryId && <span>Reversal of {entry.reversalOfEntryId}</span>}
        </div>
      )}

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

      <Dialog open={reverseOpen} onOpenChange={setReverseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse journal entry</DialogTitle>
            <DialogDescription>
              This posts an offsetting entry that reverses {entry.entryNumber}. This action affects the ledger and cannot be undone
              from here.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reversalDate">Reversal date</Label>
              <Input id="reversalDate" type="date" value={reversalDate} onChange={(e) => setReversalDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReverseOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReverse} disabled={reverseEntry.isPending}>
              {reverseEntry.isPending ? 'Reversing…' : 'Reverse entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
