import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState } from '@/components/common/StateViews'
import { useAllFacilities } from '@/modules/facility/facilities/api'
import { FacilityType, ParkingSpaceStatus, ParkingSpaceStatusLabel, type ParkingSpaceDto } from '@/types/api'
import { useParkingSpaces } from './api'
import { AllocateParkingDialog } from './AllocateParkingDialog'
import { ParkingSpaceFormDialog } from './ParkingSpaceFormDialog'

const ALL = 'all'

const statusVariant: Record<ParkingSpaceStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [ParkingSpaceStatus.Available]: 'success',
  [ParkingSpaceStatus.Allocated]: 'default',
  [ParkingSpaceStatus.Inactive]: 'destructive',
}

export function ParkingSpacesPage() {
  const [facilityId, setFacilityId] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [allocateSpace, setAllocateSpace] = useState<ParkingSpaceDto | undefined>()

  const { data: facilities } = useAllFacilities(FacilityType.ShoppingMall)
  const { data: spaces } = useParkingSpaces({ facilityId: facilityId === ALL ? undefined : facilityId })

  return (
    <div>
      <PageHeader
        title="Parking Spaces"
        description="Parking spaces belonging to mall facilities."
        actions={
          <PermissionGate permission="facility.mall.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New space
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
      </div>

      {(spaces?.length ?? 0) === 0 ? (
        <EmptyState title="No parking spaces found" description="Add a parking space to start allocating it." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {spaces!.map((space) => (
              <TableRow key={space.id}>
                <TableCell className="font-medium">{space.code}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[space.status]}>{ParkingSpaceStatusLabel[space.status]}</Badge>
                </TableCell>
                <TableCell>
                  {space.status === ParkingSpaceStatus.Available && (
                    <PermissionGate permission="facility.mall.manage">
                      <Button size="sm" variant="outline" onClick={() => setAllocateSpace(space)}>
                        Allocate
                      </Button>
                    </PermissionGate>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ParkingSpaceFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AllocateParkingDialog open={!!allocateSpace} onOpenChange={(o) => !o && setAllocateSpace(undefined)} space={allocateSpace} />
    </div>
  )
}
