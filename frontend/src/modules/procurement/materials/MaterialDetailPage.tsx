import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { StockMovementType, StockMovementTypeLabel } from '@/types/api'
import { useMaterial, useMaterialMovements } from './api'
import { MaterialFormDialog } from './MaterialFormDialog'
import { StockMovementDialog } from './StockMovementDialog'

const movementVariant: Record<StockMovementType, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [StockMovementType.Receipt]: 'success',
  [StockMovementType.Issue]: 'secondary',
  [StockMovementType.Adjustment]: 'outline',
}

export function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: material, isLoading, isError, refetch } = useMaterial(id)
  const { data: movements } = useMaterialMovements(id)
  const [editOpen, setEditOpen] = useState(false)
  const [movementOpen, setMovementOpen] = useState(false)

  if (isLoading) return <LoadingState label="Loading material…" />
  if (isError || !material) return <ErrorState message="Could not load this material." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        title={`${material.sku} · ${material.name}`}
        description={material.category ?? undefined}
        actions={
          <PermissionGate permission="procurement.order.manage">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button onClick={() => setMovementOpen(true)}>Record movement</Button>
            </div>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Stock</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="On hand">{material.currentQuantity}</Field>
            <Field label="Minimum">{material.minimumQuantity}</Field>
            <Field label="Unit of measure">{material.unitOfMeasure}</Field>
            <Field label="Status">
              {material.isBelowMinimum ? (
                <Badge variant="destructive">Below minimum</Badge>
              ) : (
                <Badge variant={material.isActive ? 'success' : 'secondary'}>{material.isActive ? 'OK' : 'Inactive'}</Badge>
              )}
            </Field>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Movement history</CardTitle>
          </CardHeader>
          <CardContent>
            {(movements?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No movements recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements!.map((mv) => (
                    <TableRow key={mv.id}>
                      <TableCell className="text-muted-foreground">{formatDate(mv.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={movementVariant[mv.type]}>{StockMovementTypeLabel[mv.type]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{mv.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{mv.notes ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <MaterialFormDialog open={editOpen} onOpenChange={setEditOpen} material={material} />
      {id && <StockMovementDialog open={movementOpen} onOpenChange={setMovementOpen} materialId={id} />}
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
