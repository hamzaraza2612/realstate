import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { CoordinateMapView } from '@/components/common/CoordinateMapView'
import type { MapPoint } from '@/components/common/CoordinateMapView'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { InventoryStatus, InventoryStatusLabel, InventoryUnitTypeLabel, ProjectStatus, ProjectStatusLabel, ProjectTypeLabel } from '@/types/api'
import { HierarchyTree } from './nodes/HierarchyTree'
import { ProjectNodeFormDialog } from './nodes/ProjectNodeFormDialog'
import { useProjectNodes } from './nodes/api'
import { useInventory } from '@/modules/inventory/api'
import { InventoryFormDialog } from '@/modules/inventory/InventoryFormDialog'
import { useProject, useUpdateProject } from './api'

const statusDotClass: Record<InventoryStatus, string> = {
  [InventoryStatus.Available]: 'bg-emerald-500',
  [InventoryStatus.Reserved]: 'bg-amber-500',
  [InventoryStatus.Booked]: 'bg-blue-500',
  [InventoryStatus.Sold]: 'bg-slate-500',
  [InventoryStatus.Blocked]: 'bg-red-500',
  [InventoryStatus.UnderConstruction]: 'bg-orange-500',
  [InventoryStatus.HandedOver]: 'bg-violet-500',
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  status: z.string(),
  description: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  addressLine: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: project, isLoading, isError, refetch } = useProject(id)
  const updateProject = useUpdateProject()
  const { data: nodes } = useProjectNodes(id)
  const { data: inventory } = useInventory(1, { projectId: id }, 200)
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false)
  const [unitDialogOpen, setUnitDialogOpen] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        status: String(project.status),
        description: project.description ?? '',
        city: project.city ?? '',
        country: project.country ?? '',
        addressLine: project.addressLine ?? '',
        latitude: project.latitude != null ? String(project.latitude) : '',
        longitude: project.longitude != null ? String(project.longitude) : '',
      })
    }
  }, [project, reset])

  async function onSubmit(values: FormValues) {
    if (!id || !project) return
    try {
      await updateProject.mutateAsync({
        id,
        payload: {
          name: values.name,
          status: Number(values.status) as ProjectStatus,
          description: values.description || null,
          addressLine: values.addressLine || null,
          city: values.city || null,
          state: project.state,
          country: values.country || null,
          postalCode: project.postalCode,
          startDate: project.startDate,
          endDate: project.endDate,
          latitude: values.latitude ? Number(values.latitude) : null,
          longitude: values.longitude ? Number(values.longitude) : null,
          geoJson: project.geoJson,
        },
      })
      toast({ title: 'Project updated', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not update project', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading project…" />
  if (isError || !project) return <ErrorState message="Could not load this project." onRetry={() => refetch()} />

  const mapPoints: MapPoint[] = (inventory?.items ?? [])
    .filter((u) => u.latitude != null && u.longitude != null)
    .map((u) => ({
      id: u.id,
      label: u.code,
      sublabel: InventoryStatusLabel[u.status],
      latitude: u.latitude!,
      longitude: u.longitude!,
      colorClassName: statusDotClass[u.status],
    }))

  return (
    <div>
      <PageHeader title={project.name} description={`${ProjectTypeLabel[project.type]} · ${project.code}`} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy ({project.nodeCount})</TabsTrigger>
          <TabsTrigger value="inventory">Inventory ({project.inventoryCount})</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Project details</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Status</Label>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ProjectStatusLabel).map(([value, label]) => (
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
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register('city')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" {...register('country')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input id="latitude" type="number" step="0.000001" {...register('latitude')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input id="longitude" type="number" step="0.000001" {...register('longitude')} />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="addressLine">Address</Label>
                  <Input id="addressLine" {...register('addressLine')} />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" rows={3} {...register('description')} />
                </div>
              </CardContent>
              <CardFooter>
                <PermissionGate permission="projects.manage">
                  <Button type="submit" disabled={!isDirty || updateProject.isPending}>
                    {updateProject.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                </PermissionGate>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Hierarchy</CardTitle>
              <PermissionGate permission="projects.manage">
                <Button size="sm" onClick={() => setNodeDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Add node
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              <HierarchyTree nodes={nodes ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Inventory</CardTitle>
              <PermissionGate permission="inventory.manage">
                <Button size="sm" onClick={() => setUnitDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Add unit
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              {(inventory?.items.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No inventory units yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory!.items.map((unit) => (
                      <TableRow key={unit.id} className="cursor-pointer" onClick={() => navigate(`/inventory/${unit.id}`)}>
                        <TableCell className="font-medium">{unit.code}</TableCell>
                        <TableCell className="text-muted-foreground">{unit.nodePath ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{InventoryUnitTypeLabel[unit.type]}</TableCell>
                        <TableCell className="text-muted-foreground">{unit.areaSize ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{InventoryStatusLabel[unit.status]}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Inventory map</CardTitle>
            </CardHeader>
            <CardContent>
              <CoordinateMapView points={mapPoints} onSelect={(unitId) => navigate(`/inventory/${unitId}`)} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProjectNodeFormDialog open={nodeDialogOpen} onOpenChange={setNodeDialogOpen} projectId={id!} nodes={nodes ?? []} />
      <InventoryFormDialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen} defaultProjectId={id} />
    </div>
  )
}
