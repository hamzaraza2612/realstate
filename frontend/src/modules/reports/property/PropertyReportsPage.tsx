import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { DateRangeFilter } from '@/modules/reports/components/DateRangeFilter'
import { exportReportCsv } from '@/modules/reports/exportCsv'
import { money, percent } from '@/modules/reports/format'
import { LeaseStatusLabel } from '@/types/api'
import { useLeaseStatusReport, useOverdueRent, usePropertyOccupancy, usePropertyRevenue, useRentBilled, useRentCollected, useTenantAging } from './api'

export function PropertyReportsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const filters = { from: from || undefined, to: to || undefined }
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader title="Property / Rental Reports" description="Occupancy, rent billing and collection, overdue rent and tenant aging." />

      <Tabs defaultValue="occupancy">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="rent-billed">Rent Billed</TabsTrigger>
          <TabsTrigger value="rent-collected">Rent Collected</TabsTrigger>
          <TabsTrigger value="overdue-rent">Overdue Rent</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="tenant-aging">Tenant Aging</TabsTrigger>
          <TabsTrigger value="lease-status">Lease Status</TabsTrigger>
        </TabsList>

        <TabsContent value="occupancy">
          <OccupancyTab />
        </TabsContent>
        <TabsContent value="rent-billed">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="prop-billed" />
          </div>
          <RentBilledTab filters={filters} />
        </TabsContent>
        <TabsContent value="rent-collected">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="prop-collected" />
          </div>
          <RentCollectedTab filters={filters} />
        </TabsContent>
        <TabsContent value="overdue-rent">
          <OverdueRentTab onNavigate={navigate} />
        </TabsContent>
        <TabsContent value="revenue">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="prop-revenue" />
          </div>
          <RevenueTab filters={filters} />
        </TabsContent>
        <TabsContent value="tenant-aging">
          <TenantAgingTab />
        </TabsContent>
        <TabsContent value="lease-status">
          <LeaseStatusTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OccupancyTab() {
  const { data, isLoading, isError, refetch } = usePropertyOccupancy()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Occupancy by property</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/property/occupancy', undefined, 'property-occupancy.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No properties found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Total units</TableHead>
                <TableHead>Occupied</TableHead>
                <TableHead>Occupancy rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.propertyId}>
                  <TableCell className="font-medium">{row.propertyName}</TableCell>
                  <TableCell>{row.totalUnits}</TableCell>
                  <TableCell>{row.occupiedUnits}</TableCell>
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

function RentBilledTab({ filters }: { filters: { from?: string; to?: string } }) {
  const { data, isLoading, isError, refetch } = useRentBilled(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Rent billed by property</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/property/rent-billed', filters, 'rent-billed.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No rent billed in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Amount billed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.propertyId}>
                  <TableCell className="font-medium">{row.propertyName}</TableCell>
                  <TableCell>{money(row.amountBilled)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function RentCollectedTab({ filters }: { filters: { from?: string; to?: string } }) {
  const { data, isLoading, isError, refetch } = useRentCollected(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Rent collected by property</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/property/rent-collected', filters, 'rent-collected.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No rent collected in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Amount collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.propertyId}>
                  <TableCell className="font-medium">{row.propertyName}</TableCell>
                  <TableCell>{money(row.amountCollected)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function OverdueRentTab({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data, isLoading, isError, refetch } = useOverdueRent()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Overdue rent</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/property/overdue-rent', undefined, 'overdue-rent.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No overdue rent" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lease</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Days past due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.leaseId} className="cursor-pointer" onClick={() => onNavigate(`/property/leases/${row.leaseId}`)}>
                  <TableCell className="font-medium">{row.leaseNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{row.propertyName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.tenantName}</TableCell>
                  <TableCell>{money(row.outstandingAmount)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(row.dueDate)}</TableCell>
                  <TableCell className="text-destructive">{row.daysPastDue}</TableCell>
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
  const { data, isLoading, isError, refetch } = usePropertyRevenue(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Property revenue</CardTitle>
          <p className="text-sm text-muted-foreground">Rent only — Facility/Mall revenue (service charges, parking, coworking) is reported separately.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/property/revenue', filters, 'property-revenue.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No revenue in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.propertyId}>
                  <TableCell className="font-medium">{row.propertyName}</TableCell>
                  <TableCell>{money(row.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function TenantAgingTab() {
  const { data, isLoading, isError, refetch } = useTenantAging()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Tenant aging</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/property/tenant-aging', undefined, 'tenant-aging.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No outstanding rent schedules" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>1-30</TableHead>
                <TableHead>31-60</TableHead>
                <TableHead>61-90</TableHead>
                <TableHead>90+</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.rentalTenantId}>
                  <TableCell className="font-medium">{row.tenantName}</TableCell>
                  <TableCell>{money(row.current)}</TableCell>
                  <TableCell>{money(row.days1To30)}</TableCell>
                  <TableCell>{money(row.days31To60)}</TableCell>
                  <TableCell>{money(row.days61To90)}</TableCell>
                  <TableCell>{money(row.days90Plus)}</TableCell>
                  <TableCell className="font-medium">{money(row.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function LeaseStatusTab() {
  const { data, isLoading, isError, refetch } = useLeaseStatusReport()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leases by status</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No leases found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.status}>
                  <TableCell>
                    <Badge variant="secondary">{LeaseStatusLabel[row.status]}</Badge>
                  </TableCell>
                  <TableCell>{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
