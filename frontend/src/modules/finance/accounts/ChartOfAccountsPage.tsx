import { Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { Pagination } from '@/components/common/Pagination'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { type AccountDto, AccountType, AccountTypeLabel } from '@/types/api'
import { useAccounts, useDeleteAccount } from './api'
import { AccountFormDialog } from './AccountFormDialog'

const ALL = 'all'

export function ChartOfAccountsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const deleteAccount = useDeleteAccount()
  const [deleteTarget, setDeleteTarget] = useState<AccountDto | undefined>()

  const { data, isLoading, isError, refetch } = useAccounts(page, {
    search: search || undefined,
    type: type === ALL ? undefined : (Number(type) as AccountType),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteAccount.mutateAsync(deleteTarget.id)
      toast({ title: 'Account deleted', variant: 'success' })
      setDeleteTarget(undefined)
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
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(account)} disabled={deleteAccount.isPending}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </PermissionGate>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="accounts" onPageChange={setPage} />
        </>
      )}

      <AccountFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
        title="Delete account"
        description={
          deleteTarget
            ? `Delete account "${deleteTarget.code} - ${deleteTarget.name}" from the chart of accounts? This cannot be undone, and the server will refuse it if any journal lines already reference the account.`
            : ''
        }
        confirmLabel="Delete account"
        destructive
        loading={deleteAccount.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
