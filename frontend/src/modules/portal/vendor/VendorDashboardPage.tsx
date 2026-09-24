import { Bell, ClipboardList, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { useUnreadNotificationCount, useVendorAssignedWork, useVendorPurchaseOrders } from './api'

export function VendorDashboardPage() {
  const navigate = useNavigate()
  const { data: purchaseOrders } = useVendorPurchaseOrders(1, 1)
  const { data: assignedWork } = useVendorAssignedWork(1, 1)
  const { data: unreadCount } = useUnreadNotificationCount()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your purchase orders and assigned work at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={ShoppingCart} label="Purchase orders" value={String(purchaseOrders?.meta?.total ?? 0)} onClick={() => navigate('/portal/vendor/purchase-orders')} />
        <SummaryCard icon={ClipboardList} label="Assigned work" value={String(assignedWork?.meta?.total ?? 0)} onClick={() => navigate('/portal/vendor/assigned-work')} />
        <SummaryCard icon={Bell} label="Unread notifications" value={String(unreadCount ?? 0)} onClick={() => navigate('/portal/vendor/notifications')} />
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-semibold leading-tight">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </button>
  )
}
