import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { useAllFacilities } from '@/modules/facility/facilities/api'
import { RecordFacilityPaymentDialog } from '@/modules/facility/payments/RecordFacilityPaymentDialog'
import { FacilityPaymentSourceType, UtilityType, UtilityTypeLabel, type UtilityReadingDto } from '@/types/api'
import { useUtilityReadings } from './api'
import { UtilityReadingFormDialog } from './UtilityReadingFormDialog'

const ALL = 'all'

export function UtilitiesPage() {
  const [page, setPage] = useState(1)
  const [facilityId, setFacilityId] = useState<string>(ALL)
  const [type, setType] = useState<string>(ALL)
  const [meterReference, setMeterReference] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<UtilityReadingDto | undefined>()

  const { data: facilities } = useAllFacilities()
  const { data, isLoading, isError, refetch } = useUtilityReadings(page, {
    facilityId: facilityId === ALL ? undefined : facilityId,
    type: type === ALL ? undefined : (Number(type) as UtilityType),
    meterReference: meterReference || undefined,
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Utilities"
        description="Meter readings and billed consumption across facilities and properties."
        actions={
          <PermissionGate permission="facility.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New reading
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meter reference…"
            className="pl-8"
            value={meterReference}
            onChange={(e) => {
              setMeterReference(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={facilityId}
          onValueChange={(v) => {
            setFacilityId(v)
            setPage(1)
          }}
        >
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
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {Object.entries(UtilityTypeLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading utility readings…" />}
      {isError && <ErrorState message="Could not load utility readings." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No utility readings found" description="Try different filters or record a new reading." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meter</TableHead>
                <TableHead>Facility / Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Reading</TableHead>
                <TableHead className="text-right">Consumption</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((reading) => (
                <TableRow key={reading.id}>
                  <TableCell className="font-medium">{reading.meterReference}</TableCell>
                  <TableCell className="text-muted-foreground">{reading.facilityName ?? reading.propertyName ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{UtilityTypeLabel[reading.type]}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(reading.readingDate)}</TableCell>
                  <TableCell className="text-right">{reading.readingValue.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{reading.consumption != null ? reading.consumption.toLocaleString() : '—'}</TableCell>
                  <TableCell className="text-right">{reading.amount != null ? `$${reading.amount.toLocaleString()}` : '—'}</TableCell>
                  <TableCell className="text-right text-muted-foreground">${reading.paidAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    {reading.amount != null && reading.paidAmount < reading.amount && (
                      <PermissionGate permission="facility.payment.record">
                        <Button size="sm" variant="outline" onClick={() => setPaymentTarget(reading)}>
                          Record payment
                        </Button>
                      </PermissionGate>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} readings
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <UtilityReadingFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RecordFacilityPaymentDialog
        open={!!paymentTarget}
        onOpenChange={(o) => !o && setPaymentTarget(undefined)}
        sourceType={FacilityPaymentSourceType.Utility}
        sourceId={paymentTarget?.id}
        outstandingAmount={paymentTarget ? (paymentTarget.amount ?? 0) - paymentTarget.paidAmount : undefined}
      />
    </div>
  )
}
