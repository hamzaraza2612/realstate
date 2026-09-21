import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useSpaces } from '@/modules/facility/spaces/api'
import { DeskStatus, DeskStatusLabel, DeskType, DeskTypeLabel, SpaceType, type DeskDto } from '@/types/api'
import { useCreateDesk, useUpdateDesk } from './api'

const schema = z.object({
  spaceId: z.string().min(1, 'Space is required'),
  code: z.string().min(1, 'Code is required'),
  type: z.string(),
  status: z.string(),
})

type FormValues = z.infer<typeof schema>

export function DeskFormDialog({ open, onOpenChange, desk }: { open: boolean; onOpenChange: (open: boolean) => void; desk?: DeskDto }) {
  const createDesk = useCreateDesk()
  const updateDesk = useUpdateDesk()
  const { data: spacesPage } = useSpaces(1, { type: SpaceType.CoworkingArea })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) {
      reset(
        desk
          ? { spaceId: desk.spaceId, code: desk.code, type: String(desk.type), status: String(desk.status) }
          : { spaceId: '', code: '', type: String(DeskType.Hot), status: String(DeskStatus.Available) },
      )
    }
  }, [open, desk, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (desk) {
        await updateDesk.mutateAsync({
          id: desk.id,
          payload: { code: values.code, type: Number(values.type) as DeskType, status: Number(values.status) as DeskStatus },
        })
        toast({ title: 'Desk updated', variant: 'success' })
      } else {
        await createDesk.mutateAsync({ spaceId: values.spaceId, code: values.code, type: Number(values.type) as DeskType })
        toast({ title: 'Desk created', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      toast({ title: `Could not ${desk ? 'update' : 'create'} desk`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createDesk.isPending || updateDesk.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{desk ? 'Edit desk' : 'New desk'}</DialogTitle>
          <DialogDescription>Desks belong to a coworking area space.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {!desk && (
            <div className="flex flex-col gap-1.5">
              <Label>Space</Label>
              <Controller
                control={control}
                name="spaceId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a coworking area" />
                    </SelectTrigger>
                    <SelectContent>
                      {(spacesPage?.items ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.code} · {s.facilityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.spaceId && <p className="text-xs text-destructive">{errors.spaceId.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Code</Label>
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
                      {Object.entries(DeskTypeLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {desk && (
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
                      {Object.entries(DeskStatusLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : desk ? 'Save changes' : 'Create desk'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
