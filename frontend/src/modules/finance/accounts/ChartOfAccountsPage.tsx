import { Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { AccountType, AccountTypeLabel } from '@/types/api'
import { useAccounts, useDeleteAccount } from './api'
import { AccountFormDialog } from './AccountFormDialog'

const ALL = 'all'

export function ChartOfAccountsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const deleteAccount = useDeleteAccount()

  const { data, isLoading, isError, refetch } = useAccounts(page, {
    search: search || undefined,
    type: type === ALL ? undefined : (Number(type) as AccountType),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  async function handleDelete(id: string) {
    try {
      await deleteAccount.mutateAsync(id)
      toast({ title: 'Account deleted', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not delete account', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Chart of Accounts"
        description="Asset, liability, equity, revenue and expense accounts."
        actions={
          <PermissionGate permission="finance.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New account
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search code or name…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {Object.entries(AccountTypeLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading chart of accounts…" />}
      {isError && <ErrorState message="Could not load accounts." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No accounts found" description="Try different filters or add your first account." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.code}</TableCell>
                  <TableCell>
                    {account.name}
                    {account.isSystem && (
                      <Badge variant="outline" className="ml-2">
                        System
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{AccountTypeLabel[account.type]}</TableCell>
                  <TableCell className="text-muted-foreground">{account.parentAccountName ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">${account.balance.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={account.isActive ? 'success' : 'secondary'}>{account.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell>
                    {!account.isSystem && account.childAccountCount === 0 && (
                      <PermissionGate permission="finance.manage">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(account.id)} disabled={deleteAccount.isPending}>
                          <Trash2 className="h-3.5 w-3.5" />
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
              Page {page} of {totalPages} · {data.meta?.total} accounts
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

      <AccountFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
