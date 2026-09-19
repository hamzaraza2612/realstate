import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useAllAccounts } from '@/modules/finance/accounts/api'
import { useCreateJournalEntry } from './api'

const lineSchema = z.object({ accountId: z.string().min(1, 'Required'), debit: z.string(), credit: z.string() })

const schema = z.object({
  entryDate: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  lines: z.array(lineSchema).min(2, 'At least two lines are required'),
})

type FormValues = z.infer<typeof schema>

const today = () => new Date().toISOString().slice(0, 10)

export function JournalEntryFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createEntry = useCreateJournalEntry()
  const { data: accounts } = useAllAccounts()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { entryDate: today(), lines: [{ accountId: '', debit: '', credit: '' }, { accountId: '', debit: '', credit: '' }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const lines = watch('lines')
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0)

  useEffect(() => {
    if (open) {
      reset({ entryDate: today(), description: '', lines: [{ accountId: '', debit: '', credit: '' }, { accountId: '', debit: '', credit: '' }] })
      setError(null)
    }
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      await createEntry.mutateAsync({
        entryDate: values.entryDate,
        description: values.description || null,
        lines: values.lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: null,
        })),
      })
      toast({ title: 'Journal entry created as draft', variant: 'success' })
      onOpenChange(false)
    } catch (e) {
      setError(extractErrorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New journal entry</DialogTitle>
          <DialogDescription>Created as a draft. Debits and credits must balance before it can be posted.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entryDate">Date</Label>
              <Input id="entryDate" type="date" {...register('entryDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" {...register('description')} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Lines</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_100px_100px_auto] items-center gap-2">
                <Controller
                  control={control}
                  name={`lines.${index}.accountId` as const}
                  render={({ field: f }) => (
                    <Select value={f.value} onValueChange={f.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {(accounts ?? []).map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} · {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Input type="number" step="0.01" placeholder="Debit" {...register(`lines.${index}.debit` as const)} />
                <Input type="number" step="0.01" placeholder="Credit" {...register(`lines.${index}.credit` as const)} />
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} disabled={fields.length <= 2}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {errors.lines && <p className="text-xs text-destructive">{errors.lines.message}</p>}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ accountId: '', debit: '', credit: '' })}>
              <Plus className="h-3.5 w-3.5" /> Add line
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span>
              Total debit: <strong>${totalDebit.toLocaleString()}</strong>
            </span>
            <span>
              Total credit: <strong>${totalCredit.toLocaleString()}</strong>
            </span>
            <span className={totalDebit === totalCredit ? 'text-emerald-600' : 'text-destructive'}>
              {totalDebit === totalCredit ? 'Balanced' : 'Unbalanced'}
            </span>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEntry.isPending}>
              {createEntry.isPending ? 'Creating…' : 'Create draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
