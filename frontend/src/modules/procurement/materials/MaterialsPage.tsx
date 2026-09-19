import { AlertTriangle, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { useMaterials } from './api'
import { MaterialFormDialog } from './MaterialFormDialog'

const ALL = 'all'

export function MaterialsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [belowMinFilter, setBelowMinFilter] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useMaterials(page, {
    search: search || undefined,
    belowMinimumOnly: belowMinFilter === ALL ? undefined : belowMinFilter === 'true',
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Materials"
        description="Stock items tracked for construction and procurement."
        actions={
          <PermissionGate permission="procurement.order.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New material
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SKU or name…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={belowMinFilter}
          onValueChange={(v) => {
            setBelowMinFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Stock level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All materials</SelectItem>
            <SelectItem value="true">Below minimum</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading materials…" />}
      {isError && <ErrorState message="Could not load materials." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No materials found" description="Try different filters or add your first material." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>On hand</TableHead>
                <TableHead>Minimum</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((m) => (
                <TableRow key={m.id} className="cursor-pointer" onClick={() => navigate(`/procurement/materials/${m.id}`)}>
                  <TableCell className="font-medium">{m.sku}</TableCell>
                  <TableCell>{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.category ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{m.unitOfMeasure}</TableCell>
                  <TableCell className="text-muted-foreground">{m.currentQuantity}</TableCell>
                  <TableCell className="text-muted-foreground">{m.minimumQuantity}</TableCell>
                  <TableCell>
                    {m.isBelowMinimum ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" /> Below minimum
                      </Badge>
                    ) : (
                      <Badge variant={m.isActive ? 'success' : 'secondary'}>{m.isActive ? 'OK' : 'Inactive'}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} materials
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

      <MaterialFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
