import { Bell, LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { type ComponentType, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn, initialsFromName } from '@/lib/utils'
import { usePortalAuthStore } from '@/stores/portalAuthStore'
import { useThemeStore } from '@/stores/themeStore'

export interface PortalNavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** false keeps the tab highlighted on nested detail routes (e.g. `/bookings/:id`). Default true. */
  end?: boolean
}

/**
 * The External Portal's own shell — deliberately simpler than the internal `AppShell`
 * (sidebar + topbar admin layout): a single sticky top bar plus a lightweight horizontal tab
 * nav, mobile-responsive by collapsing that nav into a dropdown under a hamburger button.
 * Rendered once per portal area (Customer/Tenant/Owner/Vendor/Member), each supplying its own
 * `navItems` and unread-count hook.
 */
export function PortalLayout({
  navItems,
  portalTitle,
  notificationsPath,
  useUnreadCount,
}: {
  navItems: PortalNavItem[]
  portalTitle: string
  notificationsPath: string
  useUnreadCount: () => { data?: number }
}) {
  const navigate = useNavigate()
  const profile = usePortalAuthStore((s) => s.profile)
  const clear = usePortalAuthStore((s) => s.clear)
  const { theme, toggle } = useThemeStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: unreadCount } = useUnreadCount()

  function handleLogout() {
    clear()
    navigate('/portal/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/30">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b bg-card px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="rounded-md p-1.5 hover:bg-accent sm:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            E
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">{portalTitle}</span>
            <span className="truncate text-xs text-muted-foreground">{profile?.tenantName}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <NavLink to={notificationsPath} className="relative rounded-md p-2 hover:bg-accent" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {!!unreadCount && unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
          <Avatar>
            <AvatarFallback>{initialsFromName(profile?.displayName ?? '?')}</AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-b bg-card px-2 py-2 sm:hidden">
          {navItems.map((item) => (
            <PortalNavLink key={item.to} item={item} onClick={() => setMenuOpen(false)} />
          ))}
        </nav>
      )}

      <nav className="hidden gap-1 overflow-x-auto border-b bg-card px-4 sm:flex sm:px-6">
        {navItems.map((item) => (
          <PortalNavLink key={item.to} item={item} horizontal />
        ))}
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}

function PortalNavLink({ item, horizontal, onClick }: { item: PortalNavItem; horizontal?: boolean; onClick?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end ?? true}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
          horizontal && 'whitespace-nowrap rounded-none border-b-2 border-transparent px-2 py-3',
          isActive && (horizontal ? 'border-primary text-primary hover:text-primary' : 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'),
        )
      }
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  )
}
