import { router, type Href } from 'expo-router'
import { Card, LinkField } from '@/components'
import { DocumentsPanel } from '@/features/documents/DocumentsPanel'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'

/**
 * The record an approval request is about. The backend's approval-linked modules are Booking,
 * PurchaseOrder and Expense (`ApprovalLinkedEntityHandlers.cs`); for those, the approver can open
 * the record's mobile detail screen (if they hold that module's view permission) and see the
 * documents attached to it — e.g. the receipt photo on an expense — before deciding. The decision
 * itself still goes through the one existing `POST /approvals/{id}/decide`.
 */
const LINKED: Record<string, { labelKey: string; permission: string; href: (id: string) => Href }> = {
  Booking: { labelKey: 'approvals.openBooking', permission: 'sales.booking.view', href: (id) => ({ pathname: '/sales/bookings/[id]', params: { id } }) },
  PurchaseOrder: {
    labelKey: 'approvals.openPurchaseOrder',
    permission: 'procurement.view',
    href: (id) => ({ pathname: '/procurement/purchase-orders/[id]', params: { id } }),
  },
  Expense: { labelKey: 'approvals.openExpense', permission: 'construction.view', href: (id) => ({ pathname: '/construction/expenses/[id]', params: { id } }) },
}

export function RelatedRecord({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { t } = useI18n()
  const linked = LINKED[entityType]
  const canOpen = usePermission(linked?.permission ?? '__none__')
  if (!linked) return null
  return (
    <>
      {canOpen ? (
        <Card>
          <LinkField label={t('approvals.relatedRecord')} value={t(linked.labelKey)} icon="open-outline" onPress={() => router.push(linked.href(entityId))} />
        </Card>
      ) : null}
      <DocumentsPanel entityType={entityType} entityId={entityId} />
    </>
  )
}
