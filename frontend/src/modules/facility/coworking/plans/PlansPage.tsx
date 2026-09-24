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
import { FacilityType, type MembershipPlanDto } from '@/types/api'
import { usePlans } from './api'
import { PlanFormDialog } from './PlanFormDialog'

const ALL = 'all'

export function PlansPage() {
  const [facilityId, setFacilityId] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [editPlan, setEditPlan] = useState<MembershipPlanDto | undefined>()

  const { data: facilities } = useAllFacilities(FacilityType.Coworking)
  const { data: plans } = usePlans({ facilityId: facilityId === ALL ? undefined : facilityId })

  return (
    <div>
      <PageHeader
        title="Membership Plans"
        description="Plans that coworking members can subscribe to."
        actions={
          <PermissionGate permission="facility.coworking.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New plan
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

      {(plans?.length ?? 0) === 0 ? (
        <EmptyState title="No membership plans found" description="Add a plan for members to subscribe to." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Included hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans!.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell className="text-muted-foreground">{plan.facilityName}</TableCell>
                <TableCell className="text-right">{plan.durationDays} days</TableCell>
                <TableCell className="text-right">${plan.price.toLocaleString()}</TableCell>
                <TableCell className="text-right text-muted-foreground">{plan.includedHoursCredits ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={plan.isActive ? 'success' : 'secondary'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
                <TableCell>
                  <PermissionGate permission="facility.coworking.manage">
                    <Button size="sm" variant="outline" onClick={() => setEditPlan(plan)}>
                      Edit
                    </Button>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PlanFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PlanFormDialog open={!!editPlan} onOpenChange={(open) => !open && setEditPlan(undefined)} plan={editPlan} />
    </div>
  )
}
