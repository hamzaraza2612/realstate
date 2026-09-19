import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import type { VendorDto } from '@/types/api'
import { useVendors } from './api'
import { VendorFormDialog } from './VendorFormDialog'

const ALL = 'all'

export function VendorsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [editVendor, setEditVendor] = useState<VendorDto | undefined>()

  const { data, isLoading, isError, refetch } = useVendors(page, {
    search: search || undefined,
    isActive: activeFilter === ALL ? undefined : activeFilter === 'true',
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Vendors"
        description="Suppliers used for purchase orders and construction expenses."
        actions={
          <PermissionGate permission="procurement.order.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New vendor
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={activeFilter}
          onValueChange={(v) => {
            setActiveFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All vendors</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading vendors…" />}
      {isError && <ErrorState message="Could not load vendors." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No vendors found" description="Try different filters or add your first vendor." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((vendor) => (
                <TableRow key={vendor.id} className="cursor-pointer" onClick={() => setEditVendor(vendor)}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell className="text-muted-foreground">{vendor.contactPerson ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{vendor.email ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{vendor.phone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={vendor.isActive ? 'success' : 'secondary'}>{vendor.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} vendors
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

      <VendorFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <VendorFormDialog open={!!editVendor} onOpenChange={(open) => !open && setEditVendor(undefined)} vendor={editVendor} />
    </div>
  )
}
