import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { NavLink, matchPath, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { EXACT_MATCH_PATHS, useVisibleNavigation, type NavItem, type NavSection } from './navigation'

const COLLAPSED_STORAGE_KEY = 'erp-nav-collapsed'

function readCollapsed(): NavSection[] {
  try {
    const raw = window.localStorage.getItem(COLLAPSED_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as NavSection[]) : []
  } catch {
    return []
  }
}

function writeCollapsed(value: NavSection[]) {
  try {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Private browsing / blocked storage — collapse state just won't be remembered.
  }
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-e bg-card md:flex">
      <BrandMark />
      <SidebarNav />
    </aside>
  )
}

export function BrandMark() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b px-5">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">E</div>
      <span className="text-sm font-semibold">Estatery ERP</span>
    </div>
  )
}

/** The nav tree itself — shared by the desktop `<aside>` above and the mobile drawer in the
 * Topbar. `onNavigate` lets the drawer close itself when a link is tapped. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n()
  const { sections, visiblePlatformItems } = useVisibleNavigation()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState<NavSection[]>(readCollapsed)

  function toggle(section: NavSection) {
    setCollapsed((current) => {
      const next = current.includes(section) ? current.filter((s) => s !== section) : [...current, section]
      writeCollapsed(next)
      return next
    })
  }

  return (
    <nav aria-label={t('shell.navigation')} className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {sections.map((section) => {
        // A collapsed section still shows while it contains the current page, so the active link
        // is never hidden.
        const containsActive = section.items.some((item) => matchPath({ path: item.to, end: EXACT_MATCH_PATHS.has(item.to) }, pathname))
        const isCollapsed = section.labelKey != null && collapsed.includes(section.id) && !containsActive
        return (
          <div key={section.id} className="flex flex-col gap-1">
            {section.labelKey && (
              <button
                type="button"
                onClick={() => toggle(section.id)}
                aria-expanded={!isCollapsed}
                className="mt-3 flex items-center justify-between rounded-md px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t(section.labelKey)}
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isCollapsed && '-rotate-90 rtl:rotate-90')} />
              </button>
            )}
            {!isCollapsed &&
              section.items.map((item) => <SidebarLink key={item.to} item={item} label={t(item.labelKey)} onNavigate={onNavigate} />)}
          </div>
        )
      })}

      {visiblePlatformItems.length > 0 && (
        <>
          <div className="mt-4 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('nav.platformAdminSection')}
          </div>
          {visiblePlatformItems.map((item) => (
            <SidebarLink key={item.to} item={item} label={t(item.labelKey)} onNavigate={onNavigate} />
          ))}
        </>
      )}
    </nav>
  )
}

function SidebarLink({ item, label, onNavigate }: { item: NavItem; label: string; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={EXACT_MATCH_PATHS.has(item.to)}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
          isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}
