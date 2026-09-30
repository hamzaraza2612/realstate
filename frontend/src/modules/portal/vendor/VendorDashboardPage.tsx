import { Bell, ClipboardList, FileText, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { useI18n } from '@/lib/i18n'
import { PortalStatCard } from '../shared/PortalStatCard'
import { useDocuments, useUnreadNotificationCount, useVendorAssignedWork, useVendorPurchaseOrders } from './api'

export function VendorDashboardPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { data: purchaseOrders, isLoading: poLoading, isError: poError, refetch: refetchPo } = useVendorPurchaseOrders(1, 1)
  const { data: assignedWork, isLoading: workLoading, isError: workError, refetch: refetchWork } = useVendorAssignedWork(1, 1)
  const { data: documents } = useDocuments()
  const { data: unreadCount } = useUnreadNotificationCount()

  if (poLoading || workLoading) return <LoadingState label="Loading your dashboard…" />
  if (poError || workError) {
    return (
      <ErrorState
        message="Could not load your dashboard."
        onRetry={() => {
          void refetchPo()
          void refetchWork()
        }}
      />
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your purchase orders and assigned work at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortalStatCard
          icon={ShoppingCart}
          label="Purchase orders"
          value={purchaseOrders?.meta?.total ?? 0}
          onClick={() => navigate('/portal/vendor/purchase-orders')}
        />
        <PortalStatCard
          icon={ClipboardList}
          label="Assigned work"
          value={assignedWork?.meta?.total ?? 0}
          onClick={() => navigate('/portal/vendor/assigned-work')}
        />
        <PortalStatCard
          icon={FileText}
          label={t('portal.documents')}
          value={(documents ?? []).length}
          onClick={() => navigate('/portal/vendor/documents')}
        />
        <PortalStatCard
          icon={Bell}
          label="Unread notifications"
          value={unreadCount ?? 0}
          onClick={() => navigate('/portal/vendor/notifications')}
        />
      </div>
    </div>
  )
}
