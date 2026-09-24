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
import { useAllFacilities } from '@/modules/facility/facilities/api'
import { FacilityType, type MallShopDto } from '@/types/api'
import { useCreateMallShop, useUpdateMallShop } from './api'

function toNumberOrNull(value: string | undefined) {
  if (!value) return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

const schema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  buildingBlock: z.string().optional(),
  code: z.string().min(1, 'Code is required'),
  areaSize: z.string().optional(),
  rate: z.string().optional(),
  tradeCategory: z.string().optional(),
  storefrontName: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function MallShopFormDialog({ open, onOpenChange, shop }: { open: boolean; onOpenChange: (open: boolean) => void; shop?: MallShopDto }) {
  const createShop = useCreateMallShop()
  const updateShop = useUpdateMallShop()
  const navigate = useNavigate()
  const { data: facilities } = useAllFacilities(FacilityType.ShoppingMall)

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
        shop
          ? {
              facilityId: shop.facilityId,
              buildingBlock: shop.buildingBlock ?? '',
              code: shop.code,
              areaSize: shop.areaSize != null ? String(shop.areaSize) : '',
              rate: shop.rate != null ? String(shop.rate) : '',
              tradeCategory: shop.tradeCategory ?? '',
              storefrontName: shop.storefrontName ?? '',
              notes: shop.notes ?? '',
            }
          : {
              facilityId: '',
              buildingBlock: '',
              code: '',
              areaSize: '',
              rate: '',
              tradeCategory: '',
              storefrontName: '',
              notes: '',
            },
      )
    }
  }, [open, shop, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (shop) {
        await updateShop.mutateAsync({
          spaceId: shop.spaceId,
          payload: {
            tradeCategory: values.tradeCategory || null,
            storefrontName: values.storefrontName || null,
            notes: values.notes || null,
          },
        })
        toast({ title: 'Mall shop updated', variant: 'success' })
        onOpenChange(false)
      } else {
        const created = await createShop.mutateAsync({
          facilityId: values.facilityId,
          buildingBlock: values.buildingBlock || null,
          code: values.code,
          areaSize: toNumberOrNull(values.areaSize),
          rate: toNumberOrNull(values.rate),
          tradeCategory: values.tradeCategory || null,
          storefrontName: values.storefrontName || null,
          notes: values.notes || null,
        })
        toast({ title: 'Mall shop created', variant: 'success' })
        onOpenChange(false)
        navigate(`/facility/mall/shops/${created.spaceId}`)
      }
    } catch (error) {
      toast({ title: `Could not ${shop ? 'update' : 'create'} mall shop`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createShop.isPending || updateShop.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{shop ? 'Edit mall shop' : 'New mall shop'}</DialogTitle>
          <DialogDescription>Creating a shop creates the underlying property unit and space together.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          {!shop && (
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
          )}

          {!shop && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">Shop code</Label>
                <Input id="code" {...register('code')} />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="buildingBlock">Building / block (optional)</Label>
                <Input id="buildingBlock" {...register('buildingBlock')} />
              </div>
            </div>
          )}

          {!shop && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="areaSize">Area size (optional)</Label>
                <Input id="areaSize" type="number" step="0.01" {...register('areaSize')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rate">Rate (optional)</Label>
                <Input id="rate" type="number" step="0.01" {...register('rate')} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tradeCategory">Trade category (optional)</Label>
              <Input id="tradeCategory" {...register('tradeCategory')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="storefrontName">Storefront name (optional)</Label>
              <Input id="storefrontName" {...register('storefrontName')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : shop ? 'Save changes' : 'Create shop'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
