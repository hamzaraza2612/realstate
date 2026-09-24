import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { useAllFacilities } from '@/modules/facility/facilities/api'
import { FacilityType, TenantNoticeStatus, TenantNoticeStatusLabel } from '@/types/api'
import { useTenantNotices, useUpdateTenantNoticeStatus } from './api'
import { NoticeFormDialog } from './NoticeFormDialog'

const ALL = 'all'

const statusVariant: Record<TenantNoticeStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [TenantNoticeStatus.Draft]: 'secondary',
  [TenantNoticeStatus.Sent]: 'default',
  [TenantNoticeStatus.Acknowledged]: 'success',
}

const nextStatus: Partial<Record<TenantNoticeStatus, { status: TenantNoticeStatus; label: string }>> = {
  [TenantNoticeStatus.Draft]: { status: TenantNoticeStatus.Sent, label: 'Send' },
  [TenantNoticeStatus.Sent]: { status: TenantNoticeStatus.Acknowledged, label: 'Mark acknowledged' },
}

export function NoticesPage() {
  const [facilityId, setFacilityId] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: facilities } = useAllFacilities(FacilityType.ShoppingMall)
  const { data: notices } = useTenantNotices({
    facilityId: facilityId === ALL ? undefined : facilityId,
    status: status === ALL ? undefined : (Number(status) as TenantNoticeStatus),
  })
  const updateStatus = useUpdateTenantNoticeStatus()

  async function handleStatus(id: string, next: TenantNoticeStatus) {
    try {
      await updateStatus.mutateAsync({ id, status: next })
      toast({ title: 'Notice status updated', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not update notice', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Tenant Notices"
        description="Notices sent to mall tenants."
        actions={
          <PermissionGate permission="facility.mall.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New notice
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={facilityId} onValueChange={setFacilityId}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Facility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All facilities</SelectItem>
            {(facilities ?? []).map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.code} · {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(TenantNoticeStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(notices?.length ?? 0) === 0 ? (
        <EmptyState title="No notices found" description="Send your first tenant notice." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {notices!.map((notice) => (
              <TableRow key={notice.id}>
                <TableCell className="font-medium">{notice.subject}</TableCell>
                <TableCell className="text-muted-foreground">{notice.facilityName}</TableCell>
                <TableCell className="text-muted-foreground">{notice.rentalTenantName ?? 'Facility-wide'}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(notice.noticeDate)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[notice.status]}>{TenantNoticeStatusLabel[notice.status]}</Badge>
                </TableCell>
                <TableCell>
                  <PermissionGate permission="facility.mall.manage">
                    {nextStatus[notice.status] && (
                      <Button size="sm" variant="outline" onClick={() => handleStatus(notice.id, nextStatus[notice.status]!.status)} disabled={updateStatus.isPending}>
                        {nextStatus[notice.status]!.label}
                      </Button>
                    )}
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <NoticeFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
