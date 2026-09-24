import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { useOwnerOverdueRent, useOwnerRentCollected, useOwnerRevenue, type OwnerReportFilters } from './api'

export function OwnerReportsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const filters: OwnerReportFilters = { from: from || undefined, to: to || undefined }

  return (
    <div>
      <PageHeader title="Reports" description="Rent collected, overdue rent, and revenue across your portfolio." />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="owner-report-from">From</Label>
          <Input id="owner-report-from" type="date" className="w-44" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="owner-report-to">To</Label>
          <Input id="owner-report-to" type="date" className="w-44" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <p className="ml-1 max-w-sm text-xs text-muted-foreground">Leave blank to use the current period.</p>
      </div>

      <Tabs defaultValue="rent-collected">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="rent-collected">Rent Collected</TabsTrigger>
          <TabsTrigger value="overdue-rent">Overdue Rent</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="rent-collected">
          <RentCollectedTab filters={filters} />
        </TabsContent>
        <TabsContent value="overdue-rent">
          <OverdueRentTab />
        </TabsContent>
        <TabsContent value="revenue">
          <RevenueTab filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RentCollectedTab({ filters }: { filters: OwnerReportFilters }) {
  const { data, isLoading, isError, refetch } = useOwnerRentCollected(filters)
  const total = (data ?? []).reduce((sum, r) => sum + r.amountCollected, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rent collected by property</CardTitle>
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
                <TableHead className="text-right">Amount collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.propertyId}>
                  <TableCell className="font-medium">{row.propertyName}</TableCell>
                  <TableCell className="text-right">${row.amountCollected.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">${total.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function OverdueRentTab() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useOwnerOverdueRent()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overdue rent</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No overdue rent" description="Nothing is past due right now." />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lease</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Days past due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.leaseId} className="cursor-pointer" onClick={() => navigate(`/portal/owner/properties/${row.propertyId}`)}>
                  <TableCell className="font-medium">{row.leaseNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{row.propertyName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.tenantName}</TableCell>
                  <TableCell className="text-right">${row.outstandingAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(row.dueDate)}</TableCell>
                  <TableCell className="text-right text-destructive">{row.daysPastDue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function RevenueTab({ filters }: { filters: OwnerReportFilters }) {
  const { data, isLoading, isError, refetch } = useOwnerRevenue(filters)
  const total = (data ?? []).reduce((sum, r) => sum + r.revenue, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by property</CardTitle>
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
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.propertyId}>
                  <TableCell className="font-medium">{row.propertyName}</TableCell>
                  <TableCell className="text-right">${row.revenue.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">${total.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
