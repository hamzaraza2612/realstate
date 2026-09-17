import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useRoles } from '@/modules/roles/api'
import { useCreateUser } from './api'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  fullName: z.string().min(1, 'Full name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phoneNumber: z.string().optional(),
  roleNames: z.array(z.string()).min(1, 'Select at least one role'),
})

type FormValues = z.infer<typeof schema>

export function UserFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: roles } = useRoles()
  const createUser = useCreateUser()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', fullName: '', password: '', phoneNumber: '', roleNames: [] },
  })

  useEffect(() => {
    if (open) reset({ email: '', fullName: '', password: '', phoneNumber: '', roleNames: [] })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await createUser.mutateAsync({
        email: values.email,
        fullName: values.fullName,
        password: values.password,
        phoneNumber: values.phoneNumber || null,
        roleNames: values.roleNames,
      })
      toast({ title: 'User created', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not create user', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>Create a new staff account and assign their initial roles.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" {...register('fullName')} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phoneNumber">Phone (optional)</Label>
              <Input id="phoneNumber" {...register('phoneNumber')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Temporary password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Roles</Label>
            <Controller
              control={control}
              name="roleNames"
              render={({ field }) => (
                <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-3">
                  {roles?.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value.includes(role.name)}
                        onCheckedChange={(checked) => {
                          field.onChange(
                            checked ? [...field.value, role.name] : field.value.filter((r) => r !== role.name),
                          )
                        }}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.roleNames && <p className="text-xs text-destructive">{errors.roleNames.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? 'Creating…' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
