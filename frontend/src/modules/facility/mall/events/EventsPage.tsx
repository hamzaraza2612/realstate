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
import { FacilityEventStatus, FacilityEventStatusLabel, FacilityType } from '@/types/api'
import { useFacilityEvents, useUpdateFacilityEventStatus } from './api'
import { EventFormDialog } from './EventFormDialog'

const ALL = 'all'

const statusVariant: Record<FacilityEventStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [FacilityEventStatus.Planned]: 'outline',
  [FacilityEventStatus.Ongoing]: 'default',
  [FacilityEventStatus.Completed]: 'success',
  [FacilityEventStatus.Cancelled]: 'destructive',
}

const nextStatus: Partial<Record<FacilityEventStatus, { status: FacilityEventStatus; label: string }[]>> = {
  [FacilityEventStatus.Planned]: [
    { status: FacilityEventStatus.Ongoing, label: 'Start' },
    { status: FacilityEventStatus.Cancelled, label: 'Cancel' },
  ],
  [FacilityEventStatus.Ongoing]: [{ status: FacilityEventStatus.Completed, label: 'Complete' }],
}

export function EventsPage() {
  const [facilityId, setFacilityId] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: facilities } = useAllFacilities(FacilityType.ShoppingMall)
  const { data: events } = useFacilityEvents({
    facilityId: facilityId === ALL ? undefined : facilityId,
    status: status === ALL ? undefined : (Number(status) as FacilityEventStatus),
  })
  const updateStatus = useUpdateFacilityEventStatus()

  async function handleStatus(id: string, next: FacilityEventStatus) {
    try {
      await updateStatus.mutateAsync({ id, status: next })
      toast({ title: 'Event status updated', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not update event', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Events"
        description="Mall events, promotions and activations."
        actions={
          <PermissionGate permission="facility.mall.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New event
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
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(FacilityEventStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(events?.length ?? 0) === 0 ? (
        <EmptyState title="No events found" description="Schedule your first mall event." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Starts</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {events!.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.title}</TableCell>
                <TableCell className="text-muted-foreground">{event.facilityName}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(event.startAt)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(event.endAt)}</TableCell>
                <TableCell className="text-muted-foreground">{event.location ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[event.status]}>{FacilityEventStatusLabel[event.status]}</Badge>
                </TableCell>
                <TableCell>
                  <PermissionGate permission="facility.mall.manage">
                    <div className="flex justify-end gap-2">
                      {(nextStatus[event.status] ?? []).map((t) => (
                        <Button key={t.status} size="sm" variant="outline" onClick={() => handleStatus(event.id, t.status)} disabled={updateStatus.isPending}>
                          {t.label}
                        </Button>
                      ))}
                    </div>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <EventFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
