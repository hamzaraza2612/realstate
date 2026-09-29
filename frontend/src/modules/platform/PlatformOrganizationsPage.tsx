import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { Pagination } from '@/components/common/Pagination'
import { StatusBadge } from '@/components/common/StatusBadge'
import { extractErrorMessage } from '@/lib/apiClient'
import { useI18n } from '@/lib/i18n'
import { formatDate } from '@/lib/utils'
import { TenantStatus, TenantStatusLabel } from '@/types/api'
import { usePlatformOrganizations, useUpdateOrganizationStatus } from './api'
import { CreateOrganizationDialog } from './CreateOrganizationDialog'

export function PlatformOrganizationsPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  // Suspending or cancelling cuts off every user in that organization, so both go through a
  // confirmation step; re-activating does not.
  const [pendingChange, setPendingChange] = useState<{ id: string; name: string; status: TenantStatus } | null>(null)

  const { data, isLoading, isError, refetch } = usePlatformOrganizations(page, search)
  const updateStatus = useUpdateOrganizationStatus()

  async function handleStatusChange(id: string, status: TenantStatus) {
    try {
      await updateStatus.mutateAsync({ id, status })
      toast({ title: 'Organization status updated', variant: 'success' })
      setPendingChange(null)
    } catch (error) {
      toast({ title: 'Could not update status', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const pendingIsCancel = pendingChange?.status === TenantStatus.Cancelled

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Every tenant on the platform. Activate, suspend, or onboard new customers."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create organization
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or slug…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {isLoading && <LoadingState label="Loading organizations…" />}
      {isError && <ErrorState message="Could not load organizations." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        search.trim() ? (
          <EmptyState title={t('platform.organizations.noMatchTitle')} description={t('platform.organizations.noMatchDescription')} />
        ) : (
          <EmptyState
            title="No organizations yet"
            description="Create the first tenant to get started."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Create organization
              </Button>
            }
          />
        )
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((org) => (
                <TableRow
                  key={org.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/platform/organizations/${org.id}`)}
                >
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell className="text-muted-foreground">{org.slug}</TableCell>
                  <TableCell>
                    <StatusBadge status={org.status} labels={TenantStatusLabel} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(org.createdAt)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/platform/organizations/${org.id}`)}>
                          View details
                        </DropdownMenuItem>
                        {org.status !== TenantStatus.Active && (
                          <DropdownMenuItem onClick={() => handleStatusChange(org.id, TenantStatus.Active)}>
                            Activate
                          </DropdownMenuItem>
                        )}
                        {org.status !== TenantStatus.Suspended && (
                          <DropdownMenuItem onClick={() => setPendingChange({ id: org.id, name: org.name, status: TenantStatus.Suspended })}>
                            Suspend
                          </DropdownMenuItem>
                        )}
                        {org.status !== TenantStatus.Cancelled && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setPendingChange({ id: org.id, name: org.name, status: TenantStatus.Cancelled })}
                          >
                            Cancel
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="organizations" onPageChange={setPage} />
        </>
      )}

      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={pendingChange !== null}
        onOpenChange={(open) => !open && setPendingChange(null)}
        title={(pendingIsCancel ? t('platform.organizations.confirmCancelTitle') : t('platform.organizations.confirmSuspendTitle')).replace(
          '{name}',
          pendingChange?.name ?? '',
        )}
        description={pendingIsCancel ? t('platform.organizations.confirmCancelDescription') : t('platform.organizations.confirmSuspendDescription')}
        confirmLabel={pendingIsCancel ? t('platform.organizations.confirmCancelAction') : t('platform.organizations.confirmSuspendAction')}
        cancelLabel={t('platform.organizations.keepAsIs')}
        destructive
        loading={updateStatus.isPending}
        onConfirm={() => pendingChange && handleStatusChange(pendingChange.id, pendingChange.status)}
      />
    </div>
  )
}
