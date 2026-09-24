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
import type { CoworkingMemberDto } from '@/types/api'
import { useMembers } from './api'
import { MemberFormDialog } from './MemberFormDialog'

const ALL = 'all'

export function MembersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [editMember, setEditMember] = useState<CoworkingMemberDto | undefined>()

  const { data, isLoading, isError, refetch } = useMembers(page, {
    search: search || undefined,
    isActive: activeFilter === ALL ? undefined : activeFilter === 'true',
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Coworking Members"
        description="Members linked to CRM customer records."
        actions={
          <PermissionGate permission="facility.coworking.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New member
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
            <SelectItem value={ALL}>All members</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading members…" />}
      {isError && <ErrorState message="Could not load members." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No members found" description="Try different filters or add your first member." />}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Active memberships</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.customerName}</TableCell>
                  <TableCell className="text-muted-foreground">{member.email ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{member.phone ?? '—'}</TableCell>
                  <TableCell className="text-right">{member.activeMembershipCount}</TableCell>
                  <TableCell>
                    <Badge variant={member.isActive ? 'success' : 'secondary'}>{member.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell>
                    <PermissionGate permission="facility.coworking.manage">
                      <Button size="sm" variant="outline" onClick={() => setEditMember(member)}>
                        Edit
                      </Button>
                    </PermissionGate>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} members
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

      <MemberFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <MemberFormDialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(undefined)} member={editMember} />
    </div>
  )
}
