import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { PropertyStatus, PropertyStatusLabel, PropertyTypeLabel, PropertyUnitStatus, PropertyUnitStatusLabel } from '@/types/api'
import { useOwnerProperty } from './api'

const statusVariant: Record<PropertyStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [PropertyStatus.Active]: 'success',
  [PropertyStatus.Inactive]: 'secondary',
  [PropertyStatus.UnderRenovation]: 'outline',
}

const unitStatusVariant: Record<PropertyUnitStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [PropertyUnitStatus.Available]: 'outline',
  [PropertyUnitStatus.Reserved]: 'default',
  [PropertyUnitStatus.Occupied]: 'success',
  [PropertyUnitStatus.Maintenance]: 'secondary',
  [PropertyUnitStatus.Inactive]: 'destructive',
}

export function OwnerPropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: property, isLoading, isError, refetch } = useOwnerProperty(id)

  if (isLoading) return <LoadingState label="Loading property…" />
  if (isError || !property) return <ErrorState message="Could not load this property." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title={property.name} description={property.code} />

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="Type">{PropertyTypeLabel[property.type]}</Field>
          <Field label="Status">
            <Badge variant={statusVariant[property.status]}>{PropertyStatusLabel[property.status]}</Badge>
          </Field>
          <Field label="Units">{property.units.length}</Field>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Units</CardTitle>
        </CardHeader>
        <CardContent>
          {property.units.length === 0 ? (
            <p className="text-sm text-muted-foreground">No units recorded for this property.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Market rent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {property.units.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.unitNumber}</TableCell>
                    <TableCell>
                      <Badge variant={unitStatusVariant[u.status]}>{PropertyUnitStatusLabel[u.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.tenantName ?? '—'}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {u.marketRentRate != null ? `$${u.marketRentRate.toLocaleString()}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  )
}
