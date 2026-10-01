import { useState } from 'react'
import { router } from 'expo-router'
import { PagedList, RecordCard, Screen, SearchField, StatusBadge, StatusFilter } from '@/components'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { LeadPriorityLabel, LeadSourceLabel, LeadStatusLabel, type LeadStatus } from '@/types/modules'
import { useLeads } from './api'

/** Leads — `GET /crm/leads` with the endpoint's own `search` (name/email/phone/company) and
 * `status` filters, 20 per page. */
export function LeadsListScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<LeadStatus | undefined>()
  const leads = useLeads(search, status)

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={leads}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('crm.leads.search')} />
            <StatusFilter labels={LeadStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(lead) => lead.id}
        emptyIcon="person-add-outline"
        emptyTitle={t('crm.leads.empty')}
        errorMessage={t('crm.leads.loadError')}
        renderItem={(lead) => (
          <RecordCard
            title={lead.fullName}
            subtitle={[lead.companyName, lead.phone ?? lead.email].filter(Boolean).join(' · ') || null}
            meta={`${enumLabel(LeadSourceLabel, lead.source)} · ${t('crm.priorityValue', { priority: enumLabel(LeadPriorityLabel, lead.priority) })}${
              lead.assignedToUserName ? ` · ${lead.assignedToUserName}` : ''
            }`}
            badge={<StatusBadge status={lead.status} labels={LeadStatusLabel} />}
            onPress={() => router.push({ pathname: '/crm/leads/[id]', params: { id: lead.id } })}
          />
        )}
      />
    </Screen>
  )
}
