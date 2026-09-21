import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { ExpenseCategory, ExpenseCategoryLabel, ExpenseStatus, ExpenseStatusLabel, type ExpenseDto } from '@/types/api'
import { useApproveExpense, useExpenses, useRejectExpense } from './api'
import { ExpenseFormDialog } from './ExpenseFormDialog'
import { PayExpenseDialog } from './PayExpenseDialog'

const ALL = 'all'

const statusVariant: Record<ExpenseStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [ExpenseStatus.Pending]: 'secondary',
  [ExpenseStatus.Approved]: 'success',
  [ExpenseStatus.Rejected]: 'destructive',
}

export function ExpensesPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>(ALL)
  const [category, setCategory] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [payTarget, setPayTarget] = useState<ExpenseDto | null>(null)

  const { data, isLoading, isError, refetch } = useExpenses(page, {
    status: status === ALL ? undefined : (Number(status) as ExpenseStatus),
    category: category === ALL ? undefined : (Number(category) as ExpenseCategory),
  })
  const approveExpense = useApproveExpense()
  const rejectExpense = useRejectExpense()

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  async function handleApprove(id: string) {
    try {
      await approveExpense.mutateAsync(id)
      toast({ title: 'Expense approved', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not approve expense', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectExpense.mutateAsync(id)
      toast({ title: 'Expense rejected', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not reject expense', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Construction expenses posted against projects and work packages."
        actions={
          <PermissionGate permission="construction.project.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New expense
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
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(ExpenseStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {Object.entries(ExpenseCategoryLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading expenses…" />}
      {isError && <ErrorState message="Could not load expenses." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No expenses found" description="Try different filters or record your first expense." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Work package</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{formatDate(e.expenseDate)}</TableCell>
                  <TableCell className="font-medium">{e.projectName}</TableCell>
                  <TableCell className="text-muted-foreground">{e.workPackageName ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{ExpenseCategoryLabel[e.category]}</TableCell>
                  <TableCell className="text-muted-foreground">{e.vendorName ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    ${e.amount.toLocaleString()}
                    {e.status === ExpenseStatus.Approved && e.paidAmount > 0 && (
                      <Badge variant="outline" className="ml-2">
                        ${e.paidAmount.toLocaleString()} of ${e.amount.toLocaleString()} paid
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[e.status]}>{ExpenseStatusLabel[e.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    {e.status === ExpenseStatus.Pending && (
                      <PermissionGate permission="procurement.order.approve">
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApprove(e.id)} disabled={approveExpense.isPending}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(e.id)} disabled={rejectExpense.isPending}>
                            Reject
                          </Button>
                        </div>
                      </PermissionGate>
                    )}
                    {e.status === ExpenseStatus.Approved && e.paidAmount < e.amount && (
                      <PermissionGate permission="finance.manage">
                        <Button size="sm" onClick={() => setPayTarget(e)}>
                          Record payment
                        </Button>
                      </PermissionGate>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} expenses
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

      <ExpenseFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PayExpenseDialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)} expense={payTarget} />
    </div>
  )
}
