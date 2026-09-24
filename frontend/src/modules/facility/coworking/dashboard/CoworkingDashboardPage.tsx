import { AlertTriangle, Armchair, CalendarClock, Users } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { useAllFacilities } from '@/modules/facility/facilities/api'
import { FacilityType } from '@/types/api'
import { useCoworkingDashboard } from './api'

const ALL = 'all'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export function CoworkingDashboardPage() {
  const [facilityId, setFacilityId] = useState<string>(ALL)
  const { data: facilities } = useAllFacilities(FacilityType.Coworking)
  const { data, isLoading, isError, refetch } = useCoworkingDashboard(facilityId === ALL ? undefined : facilityId)

  return (
    <div>
      <PageHeader
        title="Coworking Dashboard"
        description="Desk occupancy, membership revenue and bookings."
        actions={
          <Select value={facilityId} onValueChange={setFacilityId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All coworking facilities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All coworking facilities</SelectItem>
              {(facilities ?? []).map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.code} · {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading && <LoadingState label="Loading coworking dashboard…" />}
      {isError && <ErrorState message="Could not load the coworking dashboard." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Armchair} label="Desks" value={data.totalDesks} description={`${data.occupiedDesks} occupied · ${data.availableDesks} available`} />
            <StatCard icon={Armchair} label="Occupancy" value={`${data.occupancy}%`} description="Desk occupancy rate" />
            <StatCard icon={Users} label="Active members" value={data.activeMembers} description="Members with an active membership" />
            <StatCard icon={AlertTriangle} label="Membership revenue" value={`$${formatCurrency(data.membershipRevenue)}`} description="Total collected" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={CalendarClock} label="Meeting room bookings" value={data.meetingRoomBookings} description="Total bookings made" />
            <StatCard icon={AlertTriangle} label="Utilization" value={data.utilizationSummary} description="Overall resource utilization" />
            <StatCard
              icon={AlertTriangle}
              label="Open maintenance / service"
              value={data.openMaintenanceOrServiceRequests}
              description="Requests awaiting resolution"
              alert={data.openMaintenanceOrServiceRequests > 0}
            />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Upcoming bookings</CardTitle>
              <CardDescription>Desk and meeting room bookings coming up.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.upcomingBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Starts</TableHead>
                      <TableHead>Ends</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.upcomingBookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.memberName}</TableCell>
                        <TableCell className="text-muted-foreground">{b.resourceLabel}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(b.startAt)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(b.endAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  alert,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  description: string
  alert?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Icon className={alert ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-primary'} />
        </div>
        <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
        <CardDescription>{label}</CardDescription>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
    </Card>
  )
}
