import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState } from '@/components/common/StateViews'
import { DeskStatus, DeskStatusLabel, DeskTypeLabel, type DeskDto } from '@/types/api'
import { useDesks } from './api'
import { DeskFormDialog } from './DeskFormDialog'

const ALL = 'all'

const statusVariant: Record<DeskStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [DeskStatus.Available]: 'success',
  [DeskStatus.Occupied]: 'default',
  [DeskStatus.Maintenance]: 'secondary',
  [DeskStatus.Inactive]: 'destructive',
}

export function DesksPage() {
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [editDesk, setEditDesk] = useState<DeskDto | undefined>()

  const { data: desks } = useDesks({ status: status === ALL ? undefined : (Number(status) as DeskStatus) })

  return (
    <div>
      <PageHeader
        title="Desks"
        description="Hot and dedicated desks available for coworking bookings."
        actions={
          <PermissionGate permission="facility.coworking.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New desk
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(DeskStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(desks?.length ?? 0) === 0 ? (
        <EmptyState title="No desks found" description="Add a desk within a coworking area." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Space</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {desks!.map((desk) => (
              <TableRow key={desk.id}>
                <TableCell className="font-medium">{desk.code}</TableCell>
                <TableCell className="text-muted-foreground">{desk.spaceCode}</TableCell>
                <TableCell className="text-muted-foreground">{DeskTypeLabel[desk.type]}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[desk.status]}>{DeskStatusLabel[desk.status]}</Badge>
                </TableCell>
                <TableCell>
                  <PermissionGate permission="facility.coworking.manage">
                    <Button size="sm" variant="outline" onClick={() => setEditDesk(desk)}>
                      Edit
                    </Button>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <DeskFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DeskFormDialog open={!!editDesk} onOpenChange={(open) => !open && setEditDesk(undefined)} desk={editDesk} />
    </div>
  )
}
