import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { ProjectType, ProjectTypeLabel } from '@/types/api'
import { useCreateProject } from './api'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z
    .string()
    .min(1, 'Code is required')
    .regex(/^[A-Za-z0-9_-]+$/, 'Only letters, numbers, hyphens and underscores'),
  type: z.string(),
  description: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  addressLine: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function ProjectFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createProject = useCreateProject()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: String(ProjectType.Society) },
  })

  useEffect(() => {
    if (open) {
      reset({ name: '', code: '', type: String(ProjectType.Society), description: '', city: '', country: '', addressLine: '' })
    }
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      const project = await createProject.mutateAsync({
        name: values.name,
        code: values.code.toUpperCase(),
        type: Number(values.type) as ProjectType,
        description: values.description || null,
        addressLine: values.addressLine || null,
        city: values.city || null,
        state: null,
        country: values.country || null,
        postalCode: null,
        startDate: null,
        endDate: null,
        latitude: null,
        longitude: null,
        geoJson: null,
      })
      toast({ title: 'Project created', variant: 'success' })
      onOpenChange(false)
      navigate(`/projects/${project.id}`)
    } catch (error) {
      toast({ title: 'Could not create project', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Set up a project to hold its hierarchy and inventory.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" placeholder="e.g. GHS" {...register('code')} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
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
                    {Object.entries(ProjectTypeLabel).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">City (optional)</Label>
              <Input id="city" {...register('city')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="country">Country (optional)</Label>
              <Input id="country" {...register('country')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressLine">Address (optional)</Label>
            <Input id="addressLine" {...register('addressLine')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
