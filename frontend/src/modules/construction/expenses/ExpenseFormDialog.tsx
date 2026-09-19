import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useAllProjects } from '@/modules/projects/api'
import { useAllVendors } from '@/modules/procurement/vendors/api'
import { useAllWorkPackages } from '@/modules/construction/workPackages/api'
import { ExpenseCategory, ExpenseCategoryLabel } from '@/types/api'
import { useCreateExpense } from './api'

const NONE = 'none'
const today = () => new Date().toISOString().slice(0, 10)

const schema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  workPackageId: z.string().optional(),
  category: z.string().min(1, 'Required'),
  amount: z.string().min(1, 'Amount is required'),
  expenseDate: z.string().min(1, 'Date is required'),
  vendorId: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function ExpenseFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createExpense = useCreateExpense()
  const { data: projects } = useAllProjects()
  const { data: vendors } = useAllVendors()

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: '',
      workPackageId: NONE,
      category: String(ExpenseCategory.Materials),
      amount: '',
      expenseDate: today(),
      vendorId: NONE,
      referenceNumber: '',
      notes: '',
    },
  })

  const projectId = watch('projectId')
  const { data: workPackages } = useAllWorkPackages(projectId || undefined)

  useEffect(() => {
    if (open) {
      reset({
        projectId: '',
        workPackageId: NONE,
        category: String(ExpenseCategory.Materials),
        amount: '',
        expenseDate: today(),
        vendorId: NONE,
        referenceNumber: '',
        notes: '',
      })
    }
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await createExpense.mutateAsync({
        projectId: values.projectId,
        workPackageId: values.workPackageId && values.workPackageId !== NONE ? values.workPackageId : null,
        category: Number(values.category) as ExpenseCategory,
        amount: Number(values.amount),
        expenseDate: values.expenseDate,
        vendorId: values.vendorId && values.vendorId !== NONE ? values.vendorId : null,
        referenceNumber: values.referenceNumber || null,
        notes: values.notes || null,
      })
      toast({ title: 'Expense recorded', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not record expense', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New expense</DialogTitle>
          <DialogDescription>Record a construction expense pending approval.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Project</Label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {(projects ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.projectId && <p className="text-xs text-destructive">{errors.projectId.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Work package (optional)</Label>
              <Controller
                control={control}
                name="workPackageId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!projectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {(workPackages ?? []).map((wp) => (
                        <SelectItem key={wp.id} value={wp.id}>
                          {wp.code} · {wp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ExpenseCategoryLabel).map(([value, label]) => (
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
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expenseDate">Date</Label>
              <Input id="expenseDate" type="date" {...register('expenseDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Vendor (optional)</Label>
              <Controller
                control={control}
                name="vendorId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {(vendors ?? []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="referenceNumber">Reference # (optional)</Label>
            <Input id="referenceNumber" {...register('referenceNumber')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createExpense.isPending}>
              {createExpense.isPending ? 'Saving…' : 'Record expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
