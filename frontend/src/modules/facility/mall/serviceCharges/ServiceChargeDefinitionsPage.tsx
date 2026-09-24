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
import { FacilityType, LeasePaymentFrequencyLabel, ServiceChargeCalculationTypeLabel, type ServiceChargeDefinitionDto } from '@/types/api'
import { useServiceChargeDefinitions } from './api'
import { ServiceChargeDefinitionFormDialog } from './ServiceChargeDefinitionFormDialog'

const ALL = 'all'

export function ServiceChargeDefinitionsPage() {
  const [facilityId, setFacilityId] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [editDefinition, setEditDefinition] = useState<ServiceChargeDefinitionDto | undefined>()

  const { data: facilities } = useAllFacilities(FacilityType.ShoppingMall)
  const { data: definitions } = useServiceChargeDefinitions({ facilityId: facilityId === ALL ? undefined : facilityId })

  return (
    <div>
      <PageHeader
        title="Service Charge Definitions"
        description="Recurring service charges that can be generated against mall shop leases."
        actions={
          <PermissionGate permission="facility.mall.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New definition
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

      {(definitions?.length ?? 0) === 0 ? (
        <EmptyState title="No service charge definitions found" description="Add a definition to start billing service charges." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Calculation</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {definitions!.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-muted-foreground">{d.facilityName}</TableCell>
                <TableCell className="text-muted-foreground">{ServiceChargeCalculationTypeLabel[d.calculationType]}</TableCell>
                <TableCell className="text-right">${d.amount.toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">{LeasePaymentFrequencyLabel[d.billingFrequency]}</TableCell>
                <TableCell>
                  <Badge variant={d.isActive ? 'success' : 'secondary'}>{d.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
                <TableCell>
                  <PermissionGate permission="facility.mall.manage">
                    <Button size="sm" variant="outline" onClick={() => setEditDefinition(d)}>
                      Edit
                    </Button>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ServiceChargeDefinitionFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ServiceChargeDefinitionFormDialog open={!!editDefinition} onOpenChange={(open) => !open && setEditDefinition(undefined)} definition={editDefinition} />
    </div>
  )
}
