import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { useCustomers } from './api'
import { CustomerFormDialog } from './CustomerFormDialog'

export function CustomersPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useCustomers(page, search)
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Converted leads and directly onboarded customers."
        actions={
          <PermissionGate permission="crm.customer.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add customer
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {isLoading && <LoadingState label="Loading customers…" />}
      {isError && <ErrorState message="Could not load customers." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No customers found" description="Convert a lead or add your first customer directly." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((customer) => (
                <TableRow key={customer.id} className="cursor-pointer" onClick={() => navigate(`/crm/customers/${customer.id}`)}>
                  <TableCell className="font-medium">
                    {customer.fullName}
                    {customer.companyName && <span className="ml-1.5 text-sm text-muted-foreground">· {customer.companyName}</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{customer.email ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.phone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={customer.convertedFromLeadId ? 'secondary' : 'outline'}>
                      {customer.convertedFromLeadId ? 'Converted lead' : 'Direct'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(customer.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} customers
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

      <CustomerFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
