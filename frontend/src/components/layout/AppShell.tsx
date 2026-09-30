import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useLocalizationStore } from '@/stores/localizationStore'
import { CommandBar } from '@/components/common/CommandBar'
import { Breadcrumbs } from './Breadcrumbs'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  const { user, hasPermission } = useAuthStore()
  const fetchLocalization = useLocalizationStore((s) => s.fetch)
  const [commandBarOpen, setCommandBarOpen] = useState(false)

  // Global Ctrl+K / Cmd+K opens (or toggles) the command bar from anywhere in the shell.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandBarOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Bootstraps the tenant's localization profile once per session, right alongside the other
  // "current user/organization" context this shell already implies — every currency/date/number
  // formatter (lib/utils.ts, modules/reports/format.ts) reads it via the store. Skipped for
  // platform-only Super Admins (no tenantId) and for tenant users without `organizations.view`,
  // since `GET /localization/current` requires it — those callers simply keep the browser-default
  // formatting, which every formatter already falls back to.
  useEffect(() => {
    if (user?.tenantId && hasPermission('organizations.view')) {
      fetchLocalization()
    }
  }, [user?.tenantId, hasPermission, fetchLocalization])

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenCommandBar={() => setCommandBarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
      <CommandBar open={commandBarOpen} onOpenChange={setCommandBarOpen} />
    </div>
  )
}
