import { useMemo } from 'react'
import type { Href } from 'expo-router'
import { useAuth } from '@/auth'
import type { IconName } from '@/components/Icon'

/**
 * The "Work" tab's module list — the mobile analogue of the web `components/layout/navigation.ts`
 * (`navItems` + `useVisibleNavigation`). Each module is gated by the SAME permission string the web
 * nav uses for that module's top-level entry, and the same tenant rule applies (a platform-only
 * Super Admin has no tenant, so tenant modules don't apply). Visibility is a UX convenience only —
 * the backend re-authorizes every request.
 */

export type ModuleKey =
  | 'commandCenter'
  | 'crm'
  | 'agent'
  | 'sales'
  | 'projects'
  | 'property'
  | 'construction'
  | 'procurement'
  | 'facility'
  | 'reports'

export interface ModuleItem {
  key: ModuleKey
  labelKey: string
  descriptionKey: string
  icon: IconName
  /** Same code as the web nav item's `permission`. */
  permission: string
  /** The module's real screen (Phase 1: Command Center; Phase 2: CRM … Facility); Reports is still the placeholder. */
  href: Href
}

const placeholder = (key: ModuleKey): Href => ({ pathname: '/module/[key]', params: { key } })

export const MODULES: ModuleItem[] = [
  { key: 'commandCenter', labelKey: 'module.commandCenter', descriptionKey: 'module.commandCenter.description', icon: 'sparkles-outline', permission: 'ai.view', href: '/command-center' },
  { key: 'crm', labelKey: 'module.crm', descriptionKey: 'module.crm.description', icon: 'people-outline', permission: 'crm.lead.view', href: '/crm' },
  // The Agent view — `AgentPortalController` is plain internal [Authorize] (a Sales Agent's own staff
  // session, self-scoped server-side to their UserId), so it is an INTERNAL module, never a portal
  // area. Gated exactly like the web nav's "Agent Portal" entry: `sales.booking.view`.
  { key: 'agent', labelKey: 'module.agent', descriptionKey: 'module.agent.description', icon: 'person-outline', permission: 'sales.booking.view', href: '/agent' },
  { key: 'sales', labelKey: 'module.sales', descriptionKey: 'module.sales.description', icon: 'receipt-outline', permission: 'sales.booking.view', href: '/sales/bookings' },
  { key: 'projects', labelKey: 'module.projects', descriptionKey: 'module.projects.description', icon: 'folder-open-outline', permission: 'projects.view', href: '/projects' },
  { key: 'property', labelKey: 'module.property', descriptionKey: 'module.property.description', icon: 'business-outline', permission: 'property.view', href: '/property' },
  { key: 'construction', labelKey: 'module.construction', descriptionKey: 'module.construction.description', icon: 'construct-outline', permission: 'construction.view', href: '/construction' },
  { key: 'procurement', labelKey: 'module.procurement', descriptionKey: 'module.procurement.description', icon: 'cart-outline', permission: 'procurement.view', href: '/procurement' },
  { key: 'facility', labelKey: 'module.facility', descriptionKey: 'module.facility.description', icon: 'storefront-outline', permission: 'facility.view', href: '/facility' },
  { key: 'reports', labelKey: 'module.reports', descriptionKey: 'module.reports.description', icon: 'bar-chart-outline', permission: 'reports.view', href: placeholder('reports') },
]

export function isModuleKey(value: string | undefined): value is ModuleKey {
  return MODULES.some((module) => module.key === value)
}

/** The modules the signed-in user may see, in display order. */
export function useVisibleModules(): ModuleItem[] {
  const { user, hasPermission } = useAuth()
  return useMemo(() => {
    if (user?.tenantId == null) return []
    return MODULES.filter((module) => hasPermission(module.permission))
  }, [user, hasPermission])
}
