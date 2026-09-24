import { useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { useOwnerProperties } from './api'

export function OwnerPropertiesPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useOwnerProperties()

  return (
    <div>
      <PageHeader title="Your Properties" description="Every property in your portfolio." />

      {isLoading && <LoadingState label="Loading properties…" />}
      {isError && <ErrorState message="Could not load your properties." onRetry={() => refetch()} />}
      {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No properties yet" />}
      {!isLoading && !isError && data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Occupied</TableHead>
              <TableHead>Occupancy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/portal/owner/properties/${p.id}`)}>
                <TableCell className="font-medium">{p.code}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.totalUnits}</TableCell>
                <TableCell className="text-muted-foreground">{p.occupiedUnits}</TableCell>
                <TableCell className="text-muted-foreground">{p.occupancyRate.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
