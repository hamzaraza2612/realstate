import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState } from '@/components/common/StateViews'
import { MeetingRoomStatus, MeetingRoomStatusLabel, type MeetingRoomDto } from '@/types/api'
import { useRooms } from './api'
import { RoomFormDialog } from './RoomFormDialog'

const ALL = 'all'

const statusVariant: Record<MeetingRoomStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [MeetingRoomStatus.Available]: 'success',
  [MeetingRoomStatus.Maintenance]: 'secondary',
  [MeetingRoomStatus.Inactive]: 'destructive',
}

export function RoomsPage() {
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [editRoom, setEditRoom] = useState<MeetingRoomDto | undefined>()

  const { data: rooms } = useRooms({ status: status === ALL ? undefined : (Number(status) as MeetingRoomStatus) })

  return (
    <div>
      <PageHeader
        title="Meeting Rooms"
        description="Bookable meeting rooms within coworking areas."
        actions={
          <PermissionGate permission="facility.coworking.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New room
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
            {Object.entries(MeetingRoomStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(rooms?.length ?? 0) === 0 ? (
        <EmptyState title="No meeting rooms found" description="Add a meeting room within a coworking area." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Space</TableHead>
              <TableHead className="text-right">Capacity</TableHead>
              <TableHead className="text-right">Hourly rate</TableHead>
              <TableHead className="text-right">Daily rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms!.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="font-medium">{room.name}</TableCell>
                <TableCell className="text-muted-foreground">{room.spaceCode}</TableCell>
                <TableCell className="text-right">{room.capacity ?? '—'}</TableCell>
                <TableCell className="text-right">{room.hourlyRate != null ? `$${room.hourlyRate.toLocaleString()}` : '—'}</TableCell>
                <TableCell className="text-right">{room.dailyRate != null ? `$${room.dailyRate.toLocaleString()}` : '—'}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[room.status]}>{MeetingRoomStatusLabel[room.status]}</Badge>
                </TableCell>
                <TableCell>
                  <PermissionGate permission="facility.coworking.manage">
                    <Button size="sm" variant="outline" onClick={() => setEditRoom(room)}>
                      Edit
                    </Button>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <RoomFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RoomFormDialog open={!!editRoom} onOpenChange={(open) => !open && setEditRoom(undefined)} room={editRoom} />
    </div>
  )
}
