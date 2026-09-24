import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { TrendLineChart } from '@/modules/reports/components/charts'
import { DateRangeFilter } from '@/modules/reports/components/DateRangeFilter'
import { exportReportCsv } from '@/modules/reports/exportCsv'
import { labelForEnumName, money, percent } from '@/modules/reports/format'
import {
  FacilityPaymentSourceType,
  FacilityPaymentSourceTypeLabel,
  MaintenancePriority,
  MaintenancePriorityLabel,
  MaintenanceStatus,
  MaintenanceStatusLabel,
} from '@/types/api'
import {
  useBookingTrends,
  useCoworkingDeskUtilization,
  useFacilityEvents,
  useFacilityRevenue,
  useFacilityUtilization,
  useMaintenanceBacklog,
  useMallOccupancy,
  useMeetingRoomUtilization,
  useParkingReport,
  useServiceChargeCollection,
} from './api'

const priorityVariant: Record<MaintenancePriority, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [MaintenancePriority.Low]: 'secondary',
  [MaintenancePriority.Medium]: 'outline',
  [MaintenancePriority.High]: 'default',
  [MaintenancePriority.Urgent]: 'destructive',
}

const statusVariant: Record<MaintenanceStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [MaintenanceStatus.Open]: 'outline',
  [MaintenanceStatus.Assigned]: 'default',
  [MaintenanceStatus.InProgress]: 'default',
  [MaintenanceStatus.OnHold]: 'secondary',
  [MaintenanceStatus.Resolved]: 'success',
  [MaintenanceStatus.Cancelled]: 'destructive',
}

export function FacilityReportsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const filters = { from: from || undefined, to: to || undefined }
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        title="Facility / Mall / Coworking Reports"
        description="Utilization, mall and coworking occupancy, service charges, parking, events and maintenance backlog."
      />

      <Tabs defaultValue="utilization">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="mall-occupancy">Mall Occupancy</TabsTrigger>
          <TabsTrigger value="service-charges">Service Charges</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="parking">Parking</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="desks">Coworking Desks</TabsTrigger>
          <TabsTrigger value="meeting-rooms">Meeting Rooms</TabsTrigger>
          <TabsTrigger value="booking-trends">Booking Trends</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Backlog</TabsTrigger>
        </TabsList>

        <TabsContent value="utilization">
          <UtilizationTab />
        </TabsContent>
        <TabsContent value="mall-occupancy">
          <MallOccupancyTab />
        </TabsContent>
        <TabsContent value="service-charges">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="fac-sc" />
          </div>
          <ServiceChargeTab filters={filters} />
        </TabsContent>
        <TabsContent value="revenue">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="fac-rev" />
          </div>
          <RevenueTab filters={filters} />
        </TabsContent>
        <TabsContent value="parking">
          <ParkingTab />
        </TabsContent>
        <TabsContent value="events">
          <EventsTab />
        </TabsContent>
        <TabsContent value="desks">
          <DesksTab />
        </TabsContent>
        <TabsContent value="meeting-rooms">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="fac-rooms" />
          </div>
          <MeetingRoomsTab filters={filters} />
        </TabsContent>
        <TabsContent value="booking-trends">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="fac-trends" />
          </div>
          <BookingTrendsTab filters={filters} />
        </TabsContent>
        <TabsContent value="maintenance">
          <MaintenanceBacklogTab onNavigate={navigate} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UtilizationTab() {
  const { data, isLoading, isError, refetch } = useFacilityUtilization()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Space utilization by facility</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/facility/utilization', undefined, 'facility-utilization.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No facilities found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total spaces</TableHead>
                <TableHead>Occupied</TableHead>
                <TableHead>Occupancy rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.facilityId}>
                  <TableCell className="font-medium">{row.facilityName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.type}</TableCell>
                  <TableCell>{row.totalSpaces}</TableCell>
                  <TableCell>{row.occupiedSpaces}</TableCell>
                  <TableCell>{percent(row.occupancyRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function MallOccupancyTab() {
  const { data, isLoading, isError, refetch } = useMallOccupancy()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Mall occupancy</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/facility/mall-occupancy', undefined, 'mall-occupancy.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No mall facilities found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Total shops</TableHead>
                <TableHead>Occupied</TableHead>
                <TableHead>Occupancy rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.facilityId}>
                  <TableCell className="font-medium">{row.facilityName}</TableCell>
                  <TableCell>{row.totalShops}</TableCell>
                  <TableCell>{row.occupiedShops}</TableCell>
                  <TableCell>{percent(row.occupancyRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function ServiceChargeTab({ filters }: { filters: { from?: string; to?: string } }) {
  const { data, isLoading, isError, refetch } = useServiceChargeCollection(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Service charge collection</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/facility/service-charge-collection', filters, 'service-charge-collection.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No service charges due in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Billed</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.facilityId}>
                  <TableCell className="font-medium">{row.facilityName}</TableCell>
                  <TableCell>{money(row.billed)}</TableCell>
                  <TableCell>{money(row.collected)}</TableCell>
                  <TableCell>{money(row.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function RevenueTab({ filters }: { filters: { from?: string; to?: string } }) {
  const { data, isLoading, isError, refetch } = useFacilityRevenue(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Facility revenue by source</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/facility/revenue', filters, 'facility-revenue.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No facility revenue in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>By source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.facilityId}>
                  <TableCell className="font-medium">{row.facilityName}</TableCell>
                  <TableCell>{money(row.total)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {Object.entries(row.bySourceType)
                      .map(
                        ([name, amount]) =>
                          `${labelForEnumName(FacilityPaymentSourceType, FacilityPaymentSourceTypeLabel, name)}: ${money(amount)}`,
                      )
                      .join(' · ')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function ParkingTab() {
  const { data, isLoading, isError, refetch } = useParkingReport()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Parking</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/facility/parking', undefined, 'parking.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No parking facilities found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Total spaces</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Occupancy rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.facilityId}>
                  <TableCell className="font-medium">{row.facilityName}</TableCell>
                  <TableCell>{row.totalSpaces}</TableCell>
                  <TableCell>{row.allocatedSpaces}</TableCell>
                  <TableCell>{percent(row.occupancyRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function EventsTab() {
  const { data, isLoading, isError, refetch } = useFacilityEvents()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Events, upcoming vs past</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No facility events found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Upcoming</TableHead>
                <TableHead>Past</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.facilityId}>
                  <TableCell className="font-medium">{row.facilityName}</TableCell>
                  <TableCell>{row.upcomingCount}</TableCell>
                  <TableCell>{row.pastCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function DesksTab() {
  const { data, isLoading, isError, refetch } = useCoworkingDeskUtilization()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Coworking desk utilization</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/facility/coworking-desk-utilization', undefined, 'coworking-desk-utilization.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No coworking facilities found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Total desks</TableHead>
                <TableHead>Occupied</TableHead>
                <TableHead>Occupancy rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.facilityId}>
                  <TableCell className="font-medium">{row.facilityName}</TableCell>
                  <TableCell>{row.totalDesks}</TableCell>
                  <TableCell>{row.occupiedDesks}</TableCell>
                  <TableCell>{percent(row.occupancyRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function MeetingRoomsTab({ filters }: { filters: { from?: string; to?: string } }) {
  const { data, isLoading, isError, refetch } = useMeetingRoomUtilization(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Meeting room utilization</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/facility/meeting-room-utilization', filters, 'meeting-room-utilization.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No confirmed/completed room bookings in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Booked hours</TableHead>
                <TableHead>Bookings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.meetingRoomId}>
                  <TableCell className="font-medium">{row.roomName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.facilityName}</TableCell>
                  <TableCell>{row.bookedHours}</TableCell>
                  <TableCell>{row.bookingCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function BookingTrendsTab({ filters }: { filters: { from?: string; to?: string } }) {
  const { data, isLoading, isError, refetch } = useBookingTrends(filters)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coworking booking trends</CardTitle>
        <p className="text-sm text-muted-foreground">Desk + meeting room booking counts by day.</p>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No bookings in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <TrendLineChart
            data={data}
            xKey="date"
            series={[{ key: 'bookingCount', label: 'Bookings', color: 'hsl(var(--primary))' }]}
          />
        )}
      </CardContent>
    </Card>
  )
}

function MaintenanceBacklogTab({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data, isLoading, isError, refetch } = useMaintenanceBacklog()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Facility maintenance backlog</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/facility/maintenance-backlog', undefined, 'facility-maintenance-backlog.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No open maintenance requests" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Age (days)</TableHead>
                <TableHead>Assigned vendor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow
                  key={row.requestId}
                  className="cursor-pointer"
                  onClick={() => onNavigate(`/property/maintenance/${row.requestId}`)}
                >
                  <TableCell className="font-medium">{row.requestNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{row.facilityName}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[row.priority]}>{MaintenancePriorityLabel[row.priority]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[row.status]}>{MaintenanceStatusLabel[row.status]}</Badge>
                  </TableCell>
                  <TableCell>{row.ageInDays}</TableCell>
                  <TableCell className="text-muted-foreground">{row.assignedVendorName ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
