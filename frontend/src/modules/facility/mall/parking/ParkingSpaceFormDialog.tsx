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
import { useAllFacilities } from '@/modules/facility/facilities/api'
import { FacilityType } from '@/types/api'
import { useCreateParkingSpace } from './api'

const schema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  code: z.string().min(1, 'Code is required'),
})

type FormValues = z.infer<typeof schema>

export function ParkingSpaceFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createSpace = useCreateParkingSpace()
  const { data: facilities } = useAllFacilities(FacilityType.ShoppingMall)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { facilityId: '', code: '' } })

  useEffect(() => {
    if (open) reset({ facilityId: '', code: '' })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await createSpace.mutateAsync(values)
      toast({ title: 'Parking space created', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not create parking space', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New parking space</DialogTitle>
          <DialogDescription>Parking spaces can then be allocated to tenants.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Facility</Label>
            <Controller
              control={control}
              name="facilityId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a mall facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {(facilities ?? []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.code} · {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.facilityId && <p className="text-xs text-destructive">{errors.facilityId.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Code</Label>
            <Input id="code" {...register('code')} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSpace.isPending}>
              {createSpace.isPending ? 'Saving…' : 'Create space'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
