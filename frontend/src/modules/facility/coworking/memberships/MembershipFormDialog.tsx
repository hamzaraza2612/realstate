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
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useAllMembers } from '@/modules/facility/coworking/members/api'
import { usePlans } from '@/modules/facility/coworking/plans/api'
import { useCreateMembership } from './api'

const today = () => new Date().toISOString().slice(0, 10)

const schema = z.object({
  memberId: z.string().min(1, 'Member is required'),
  planId: z.string().min(1, 'Plan is required'),
  startDate: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

export function MembershipFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createMembership = useCreateMembership()
  const navigate = useNavigate()
  const { data: members } = useAllMembers()
  const { data: plans } = usePlans({ isActive: true })

  const {
    handleSubmit,
    control,
    reset,
    register,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { memberId: '', planId: '', startDate: today() } })

  useEffect(() => {
    if (open) reset({ memberId: '', planId: '', startDate: today() })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      const created = await createMembership.mutateAsync(values)
      toast({ title: 'Membership created', variant: 'success' })
      onOpenChange(false)
      navigate(`/facility/coworking/memberships/${created.id}`)
    } catch (error) {
      toast({ title: 'Could not create membership', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New membership</DialogTitle>
          <DialogDescription>End date and amount are calculated automatically from the selected plan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Member</Label>
            <Controller
              control={control}
              name="memberId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {(members ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.customerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.memberId && <p className="text-xs text-destructive">{errors.memberId.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Plan</Label>
            <Controller
              control={control}
              name="planId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {(plans ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · ${p.price.toLocaleString()} · {p.durationDays}d
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.planId && <p className="text-xs text-destructive">{errors.planId.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" type="date" {...register('startDate')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMembership.isPending}>
              {createMembership.isPending ? 'Saving…' : 'Create membership'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
