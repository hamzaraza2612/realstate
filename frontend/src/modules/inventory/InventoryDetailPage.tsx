import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { InventoryAreaUnit, InventoryAreaUnitLabel, InventoryStatus, InventoryStatusLabel, InventoryUnitType, InventoryUnitTypeLabel } from '@/types/api'
import { useChangeInventoryStatus, useInventoryUnit, useUpdateInventoryUnit } from './api'

const statusVariant: Record<InventoryStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [InventoryStatus.Available]: 'success',
  [InventoryStatus.Reserved]: 'outline',
  [InventoryStatus.Booked]: 'default',
  [InventoryStatus.Sold]: 'secondary',
  [InventoryStatus.Blocked]: 'destructive',
  [InventoryStatus.UnderConstruction]: 'outline',
  [InventoryStatus.HandedOver]: 'secondary',
}

const NEXT_STATUSES: Record<InventoryStatus, InventoryStatus[]> = {
  [InventoryStatus.Available]: [InventoryStatus.Reserved, InventoryStatus.Booked, InventoryStatus.Blocked, InventoryStatus.UnderConstruction],
  [InventoryStatus.Reserved]: [InventoryStatus.Available, InventoryStatus.Booked, InventoryStatus.Blocked],
  [InventoryStatus.Booked]: [InventoryStatus.Sold, InventoryStatus.Available, InventoryStatus.Blocked],
  [InventoryStatus.Sold]: [InventoryStatus.HandedOver, InventoryStatus.Blocked],
  [InventoryStatus.Blocked]: [InventoryStatus.Available],
  [InventoryStatus.UnderConstruction]: [InventoryStatus.Available, InventoryStatus.HandedOver, InventoryStatus.Blocked],
  [InventoryStatus.HandedOver]: [],
}

const schema = z.object({
  code: z.string().min(1, 'Code is required'),
  type: z.string(),
  areaSize: z.string().optional(),
  areaUnit: z.string(),
})

type FormValues = z.infer<typeof schema>

export function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: unit, isLoading, isError, refetch } = useInventoryUnit(id)
  const updateUnit = useUpdateInventoryUnit()
  const changeStatus = useChangeInventoryStatus()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (unit) {
      reset({
        code: unit.code,
        type: String(unit.type),
        areaSize: unit.areaSize != null ? String(unit.areaSize) : '',
        areaUnit: String(unit.areaUnit ?? InventoryAreaUnit.SqFt),
      })
    }
  }, [unit, reset])

  async function onSubmit(values: FormValues) {
    if (!id || !unit) return
    try {
      await updateUnit.mutateAsync({
        id,
        payload: {
          nodeId: unit.nodeId,
          code: values.code,
          type: Number(values.type) as InventoryUnitType,
          areaSize: values.areaSize ? Number(values.areaSize) : null,
          areaUnit: values.areaSize ? (Number(values.areaUnit) as InventoryAreaUnit) : null,
          latitude: unit.latitude,
          longitude: unit.longitude,
          geoJson: unit.geoJson,
          metadataJson: unit.metadataJson,
        },
      })
      toast({ title: 'Inventory unit updated', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not update unit', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleStatusChange(status: InventoryStatus) {
    if (!id) return
    try {
      await changeStatus.mutateAsync({ id, status })
      toast({ title: `Status changed to ${InventoryStatusLabel[status]}`, variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not change status', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading inventory unit…" />
  if (isError || !unit) return <ErrorState message="Could not load this inventory unit." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        title={unit.code}
        description={`${unit.projectName}${unit.nodePath ? ` · ${unit.nodePath}` : ''}`}
        actions={
          <Button variant="outline" onClick={() => navigate(`/projects/${unit.projectId}`)}>
            View project
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Unit details</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">Code / number</Label>
                <Input id="code" {...register('code')} />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(InventoryUnitTypeLabel).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="areaSize">Area</Label>
                <Input id="areaSize" type="number" step="0.01" {...register('areaSize')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Unit</Label>
                <Controller
                  control={control}
                  name="areaUnit"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(InventoryAreaUnitLabel).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter>
              <PermissionGate permission="inventory.manage">
                <Button type="submit" disabled={!isDirty || updateUnit.isPending}>
                  {updateUnit.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </PermissionGate>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Badge variant={statusVariant[unit.status]} className="w-fit text-sm">
              {InventoryStatusLabel[unit.status]}
            </Badge>
            <PermissionGate permission="inventory.manage">
              <div className="flex flex-col gap-2">
                {NEXT_STATUSES[unit.status].length === 0 && <p className="text-xs text-muted-foreground">This is a final status.</p>}
                {NEXT_STATUSES[unit.status].map((next) => (
                  <Button key={next} variant="outline" size="sm" disabled={changeStatus.isPending} onClick={() => handleStatusChange(next)}>
                    Mark as {InventoryStatusLabel[next]}
                  </Button>
                ))}
              </div>
            </PermissionGate>
            {(unit.latitude != null || unit.longitude != null) && (
              <p className="text-xs text-muted-foreground">
                {unit.latitude}, {unit.longitude}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
