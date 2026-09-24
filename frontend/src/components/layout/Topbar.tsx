import { Bell, LogOut, Moon, Sun, User as UserIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { cn, initialsFromName } from '@/lib/utils'
import {
  resolveNotificationLink,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useRecentNotifications,
  useUnreadNotificationCount,
} from '@/modules/notifications/api'

export function Topbar() {
  const navigate = useNavigate()
  const { user, clear } = useAuthStore()
  const { theme, toggle } = useThemeStore()

  function handleLogout() {
    clear()
    navigate('/login')
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-5">
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-medium">{user?.tenantName ?? 'Platform Administration'}</span>
        {user?.tenantName && <span className="text-xs text-muted-foreground">Organization workspace</span>}
      </div>

      <div className="flex items-center gap-2">
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
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
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
