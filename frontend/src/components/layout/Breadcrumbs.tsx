import { ChevronRight, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const labels: Record<string, string> = {
  users: 'Users',
  roles: 'Roles & Permissions',
  organization: 'Organization',
  'audit-logs': 'Audit Logs',
  platform: 'Platform Admin',
  organizations: 'Organizations',
  'subscription-plans': 'Subscription Plans',
  crm: 'CRM',
  leads: 'Leads',
  customers: 'Customers',
  projects: 'Projects',
  inventory: 'Inventory',
  sales: 'Sales',
  bookings: 'Bookings',
  finance: 'Finance',
  accounts: 'Chart of Accounts',
  journal: 'Journal',
  receivables: 'Receivables',
  'trial-balance': 'Trial Balance',
}

export function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  return (
    <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link to="/" className="flex items-center hover:text-foreground">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((segment, index) => {
        const path = '/' + segments.slice(0, index + 1).join('/')
        const isLast = index === segments.length - 1
        const label = labels[segment] ?? segment
        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
