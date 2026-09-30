import { useState } from 'react'
import { Bell, LogOut, Menu, Moon, Search, Sun, User as UserIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { cn, initialsFromName } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { BrandMark, SidebarNav } from './Sidebar'
import {
  resolveNotificationLink,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useRecentNotifications,
  useUnreadNotificationCount,
} from '@/modules/notifications/api'

export function Topbar({ onOpenCommandBar }: { onOpenCommandBar: () => void }) {
  const navigate = useNavigate()
  const { user, clear } = useAuthStore()
  const { theme, toggle } = useThemeStore()
  const { t } = useI18n()

  function handleLogout() {
    clear()
    navigate('/login')
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium">{user?.tenantName ?? 'Platform Administration'}</span>
          {user?.tenantName && <span className="hidden text-xs text-muted-foreground sm:block">Organization workspace</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onOpenCommandBar}
          className="hidden h-9 w-64 items-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 truncate text-start">{t('shell.search')}</span>
          <kbd className="pointer-events-none rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">{shortcutLabel()}</kbd>
        </button>
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenCommandBar} aria-label={t('shell.search')}>
          <Search className="h-4 w-4" />
        </Button>

        <NotificationBell />

        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar>
                <AvatarFallback>{initialsFromName(user?.fullName ?? '?')}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{user?.fullName}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/organization')}>
              <UserIcon className="h-4 w-4" /> My organization
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

function shortcutLabel() {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  return isMac ? '⌘K' : 'Ctrl K'
}

/** Below the `md` breakpoint the desktop Sidebar is hidden, so this hamburger opens the very same
 * nav tree (`SidebarNav`) in a slide-over drawer. It closes on any navigation: when a link is
 * tapped, and — because "open" is remembered as "open on this path" — whenever the route changes
 * by any other means too. */
function MobileNav() {
  const { pathname } = useLocation()
  const [openOnPath, setOpenOnPath] = useState<string | null>(null)
  const open = openOnPath === pathname
  const setOpen = (next: boolean) => setOpenOnPath(next ? pathname : null)
  const { t } = useI18n()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={() => setOpen(true)} aria-label={t('shell.openMenu')}>
        <Menu className="h-5 w-5" />
      </Button>
      <SheetContent side="start" className="p-0">
        <SheetTitle className="sr-only">{t('shell.navigation')}</SheetTitle>
        <SheetDescription className="sr-only">{t('shell.navigationDescription')}</SheetDescription>
        <BrandMark />
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

function NotificationBell() {
  const navigate = useNavigate()
  const { data: unreadCount } = useUnreadNotificationCount()
  const { data: notifications } = useRecentNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  async function handleMarkAllRead() {
    try {
      await markAllRead.mutateAsync()
    } catch (error) {
      toast({ title: 'Could not mark notifications as read', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleNotificationClick(id: string, isRead: boolean, entityType: string | null, entityId: string | null) {
    if (!isRead) {
      try {
        await markRead.mutateAsync(id)
      } catch (error) {
        toast({ title: 'Could not mark notification as read', description: extractErrorMessage(error), variant: 'destructive' })
      }
    }
    const link = resolveNotificationLink(entityType, entityId)
    if (link) navigate(link)
  }

  const count = unreadCount ?? 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="p-0 text-sm font-medium text-foreground">Notifications</DropdownMenuLabel>
          {count > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {(!notifications || notifications.length === 0) && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications yet</p>
          )}
          {notifications?.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start gap-0.5 whitespace-normal py-2"
              onClick={() => handleNotificationClick(n.id, n.isRead, n.entityType, n.entityId)}
            >
              <div className="flex w-full items-center gap-1.5">
                {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                <span className={cn('text-sm', !n.isRead && 'font-semibold')}>{n.title}</span>
              </div>
              <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-sm font-medium text-primary" onClick={() => navigate('/notifications')}>
          View all
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
