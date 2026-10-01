import { View } from 'react-native'
import { Stack } from 'expo-router'
import { OfflineBanner } from '@/components/OfflineBanner'
import { useI18n } from '@/i18n'
import { useTheme } from '@/theme'

/** Phase 2 module routes (Work tab → module hub → list → detail) and their header title keys. */
const MODULE_SCREENS: [string, string][] = [
  ['crm/index', 'module.crm'],
  ['crm/leads/index', 'crm.leads.title'],
  ['crm/leads/[id]', 'crm.leads.detailTitle'],
  ['crm/customers/index', 'crm.customers.title'],
  ['crm/customers/[id]', 'crm.customers.detailTitle'],
  ['sales/bookings/index', 'sales.bookings.title'],
  ['sales/bookings/[id]', 'sales.bookings.detailTitle'],
  ['projects/index', 'module.projects'],
  ['projects/[id]', 'projects.detailTitle'],
  ['property/index', 'module.property'],
  ['property/properties/index', 'property.properties.title'],
  ['property/properties/[id]', 'property.properties.detailTitle'],
  ['property/units/index', 'property.units.title'],
  ['property/units/[id]', 'property.units.detailTitle'],
  ['property/tenants/index', 'property.tenants.title'],
  ['property/tenants/[id]', 'property.tenants.detailTitle'],
  ['property/leases/index', 'property.leases.title'],
  ['property/leases/[id]', 'property.leases.detailTitle'],
  ['property/maintenance/index', 'property.maintenance.title'],
  ['property/maintenance/[id]', 'property.maintenance.detailTitle'],
  ['construction/index', 'module.construction'],
  ['construction/expenses/index', 'construction.expenses.title'],
  ['construction/expenses/[id]', 'construction.expenses.detailTitle'],
  ['construction/work-packages/index', 'construction.workPackages.title'],
  ['construction/work-packages/[id]', 'construction.workPackages.detailTitle'],
  ['procurement/index', 'module.procurement'],
  ['procurement/purchase-orders/index', 'procurement.orders.title'],
  ['procurement/purchase-orders/[id]', 'procurement.orders.detailTitle'],
  ['procurement/purchase-requests/index', 'procurement.requests.title'],
  ['procurement/purchase-requests/[id]', 'procurement.requests.detailTitle'],
  ['procurement/vendors/index', 'procurement.vendors.title'],
  ['procurement/vendors/[id]', 'procurement.vendors.detailTitle'],
  ['facility/index', 'module.facility'],
  ['facility/facilities/index', 'facility.facilities.title'],
  ['facility/facilities/[id]', 'facility.facilities.detailTitle'],
  ['facility/spaces/index', 'facility.spaces.title'],
  ['facility/spaces/[id]', 'facility.spaces.detailTitle'],
  ['facility/service-requests/index', 'facility.serviceRequests.title'],
  ['facility/service-requests/[id]', 'facility.serviceRequests.detailTitle'],
  ['facility/mall-shops/index', 'facility.mallShops.title'],
  ['facility/mall-shops/[id]', 'facility.mallShops.detailTitle'],
  ['facility/coworking-bookings/index', 'facility.coworkingBookings.title'],
  ['facility/coworking-bookings/[id]', 'facility.coworkingBookings.detailTitle'],
]

/** The internal (staff) app: bottom tabs plus stack screens pushed over them (Command Center,
 * approval detail, module screens). Only reachable with a staff session (see app/_layout.tsx). */
export default function InternalLayout() {
  const { colors } = useTheme()
  const { t } = useI18n()
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.foreground },
          headerBackTitle: t('common.back'),
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="command-center/index" options={{ title: t('nav.commandCenter') }} />
        <Stack.Screen name="command-center/ask" options={{ title: t('cc.ask') }} />
        <Stack.Screen name="command-center/attention" options={{ title: t('cc.attention') }} />
        <Stack.Screen name="approval/[id]" options={{ title: t('approvals.detailTitle') }} />
        <Stack.Screen name="module/[key]" options={{ title: '' }} />
        {MODULE_SCREENS.map(([name, titleKey]) => (
          <Stack.Screen key={name} name={name} options={{ title: t(titleKey) }} />
        ))}
      </Stack>
    </View>
  )
}
