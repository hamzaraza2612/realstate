import { useEffect, useState } from 'react'
import { Contact, CornerDownLeft, UserSquare2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { NAV_SECTIONS, useVisibleNavigation, type NavItem } from '@/components/layout/navigation'
import { useI18n } from '@/lib/i18n'
import { useAuthStore } from '@/stores/authStore'
import { useLeads } from '@/modules/crm/leads/api'
import { useCustomers } from '@/modules/crm/customers/api'

const MIN_SEARCH_LENGTH = 2
const SEARCH_DEBOUNCE_MS = 250
const MAX_ENTITY_RESULTS = 5

/**
 * Global Ctrl+K / Cmd+K command bar (Milestone 17). Plain client-side fuzzy matching (cmdk) over the
 * same permission-filtered navigation model the Sidebar renders, plus a debounced lookup against the
 * existing Leads and Customers list endpoints — only for users who can already see those lists.
 * No AI/LLM involvement at all: it works identically whether or not an AI provider is configured.
 */
export function CommandBar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const { t } = useI18n()

  function go(to: string) {
    onOpenChange(false)
    navigate(to)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t('commandBar.title')} description={t('commandBar.description')}>
      <CommandBarBody onSelect={go} />
    </CommandDialog>
  )
}

/** Lives inside the dialog content, which unmounts on close — so every opening starts with an
 * empty search, however the bar was closed (Esc, Ctrl+K, a selection). */
function CommandBarBody({ onSelect }: { onSelect: (to: string) => void }) {
  const go = onSelect
  const { t } = useI18n()
  const { sections, visiblePlatformItems } = useVisibleNavigation()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const belongsToTenant = useAuthStore((s) => s.user?.tenantId != null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)

  const entitySearchActive = belongsToTenant && debouncedSearch.length >= MIN_SEARCH_LENGTH
  const canSearchLeads = entitySearchActive && hasPermission('crm.lead.view')
  const canSearchCustomers = entitySearchActive && hasPermission('crm.customer.view')

  return (
    <>
      <CommandInput placeholder={t('commandBar.placeholder')} value={search} onValueChange={setSearch} />
      <CommandList>
        {/* Entity results are force-mounted (the server already matched them), so they'd sit next to
            a misleading "no results" line — the empty message only applies to page navigation. */}
        {!canSearchLeads && !canSearchCustomers && <CommandEmpty>{t('commandBar.empty')}</CommandEmpty>}

        {sections.map((section) => (
          <CommandGroup
            key={section.id}
            heading={section.labelKey ? t(section.labelKey) : t('commandBar.pages')}
          >
            {section.items.map((item) => (
              <NavCommandItem key={item.to} item={item} label={t(item.labelKey)} sectionLabel={sectionLabel(section.id, t)} onSelect={go} />
            ))}
          </CommandGroup>
        ))}

        {visiblePlatformItems.length > 0 && (
          <CommandGroup heading={t('nav.platformAdminSection')}>
            {visiblePlatformItems.map((item) => (
              <NavCommandItem
                key={item.to}
                item={item}
                label={t(item.labelKey)}
                sectionLabel={t('nav.platformAdminSection')}
                onSelect={go}
              />
            ))}
          </CommandGroup>
        )}

        {(canSearchLeads || canSearchCustomers) && <CommandSeparator />}
        {canSearchLeads && <LeadResults search={debouncedSearch} onSelect={go} />}
        {canSearchCustomers && <CustomerResults search={debouncedSearch} onSelect={go} />}
      </CommandList>
      <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CornerDownLeft className="h-3 w-3" /> {t('commandBar.hintSelect')}
        </span>
        <span>{t('commandBar.hintClose')}</span>
      </div>
    </>
  )
}

function sectionLabel(id: string, t: (key: string) => string) {
  const labelKey = NAV_SECTIONS.find((s) => s.id === id)?.labelKey
  return labelKey ? t(labelKey) : ''
}

function NavCommandItem({
  item,
  label,
  sectionLabel,
  onSelect,
}: {
  item: NavItem
  label: string
  sectionLabel: string
  onSelect: (to: string) => void
}) {
  const Icon = item.icon
  return (
    <CommandItem value={`${label} ${item.to}`} keywords={[sectionLabel, item.to]} onSelect={() => onSelect(item.to)}>
      <Icon />
      <span className="truncate">{label}</span>
    </CommandItem>
  )
}

/** Mounted only while a search is active (and the user can view leads), so the underlying list
 * query runs only then — the existing `useLeads` hook is reused unchanged. */
function LeadResults({ search, onSelect }: { search: string; onSelect: (to: string) => void }) {
  const { t } = useI18n()
  const { data, isFetching } = useLeads(1, { search })
  const items = (data?.items ?? []).slice(0, MAX_ENTITY_RESULTS)
  return (
    <CommandGroup heading={t('commandBar.leads')} forceMount>
      {items.map((lead) => (
        <CommandItem key={lead.id} value={`lead-${lead.id}`} forceMount onSelect={() => onSelect(`/crm/leads/${lead.id}`)}>
          <Contact />
          <span className="truncate">{lead.fullName}</span>
          {(lead.companyName || lead.email) && (
            <span className="truncate text-xs text-muted-foreground">{lead.companyName ?? lead.email}</span>
          )}
        </CommandItem>
      ))}
      {items.length === 0 && (
        <CommandItem value="lead-search-status" forceMount disabled>
          {isFetching ? t('commandBar.searching') : t('commandBar.noLeads')}
        </CommandItem>
      )}
    </CommandGroup>
  )
}

function CustomerResults({ search, onSelect }: { search: string; onSelect: (to: string) => void }) {
  const { t } = useI18n()
  const { data, isFetching } = useCustomers(1, search)
  const items = (data?.items ?? []).slice(0, MAX_ENTITY_RESULTS)
  return (
    <CommandGroup heading={t('commandBar.customers')} forceMount>
      {items.map((customer) => (
        <CommandItem
          key={customer.id}
          value={`customer-${customer.id}`}
          forceMount
          onSelect={() => onSelect(`/crm/customers/${customer.id}`)}
        >
          <UserSquare2 />
          <span className="truncate">{customer.fullName}</span>
          {(customer.companyName || customer.email) && (
            <span className="truncate text-xs text-muted-foreground">{customer.companyName ?? customer.email}</span>
          )}
        </CommandItem>
      ))}
      {items.length === 0 && (
        <CommandItem value="customer-search-status" forceMount disabled>
          {isFetching ? t('commandBar.searching') : t('commandBar.noCustomers')}
        </CommandItem>
      )}
    </CommandGroup>
  )
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(handle)
  }, [value, delayMs])
  return debounced
}
