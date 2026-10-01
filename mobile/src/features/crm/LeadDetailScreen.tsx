import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Card, ContactButtons, ContactField, DetailField, DetailScreen, LinkField, StatusBadge, Text } from '@/components'
import { DocumentsPanel } from '@/features/documents/DocumentsPanel'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { spacing } from '@/theme'
import { LeadPriorityLabel, LeadSourceLabel, LeadStatusLabel } from '@/types/modules'
import { formatDateTime } from '@/utils/format'
import { ActivitiesSection } from './ActivitiesSection'
import { useLead } from './api'

/** One lead (`GET /crm/leads/{id}`): contact hand-offs (dialer / mail app), the lead's key fields,
 * its CRM activities (log a call, mark done) and attached documents. */
export function LeadDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const lead = useLead(id)
  const canViewCustomer = usePermission('crm.customer.view')

  return (
    <DetailScreen query={lead} errorMessage={t('crm.leads.loadError')}>
      {(item) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <Text variant="heading">{item.fullName}</Text>
                {item.companyName ? (
                  <Text variant="bodySmall" color="mutedForeground">
                    {item.companyName}
                  </Text>
                ) : null}
              </View>
              <StatusBadge status={item.status} labels={LeadStatusLabel} />
            </View>
            <ContactButtons phone={item.phone} email={item.email} />
          </Card>

          <Card>
            <ContactField kind="phone" label={t('crm.phone')} value={item.phone} />
            <ContactField kind="email" label={t('crm.email')} value={item.email} />
            <DetailField label={t('crm.source')} value={enumLabel(LeadSourceLabel, item.source)} />
            <DetailField label={t('crm.priority')} value={enumLabel(LeadPriorityLabel, item.priority)} />
            <DetailField label={t('crm.assignedTo')} value={item.assignedToUserName ?? t('crm.unassigned')} />
            {item.convertedToCustomerId ? (
              canViewCustomer ? (
                <LinkField
                  label={t('crm.convertedTo')}
                  value={t('crm.viewCustomer')}
                  icon="person-outline"
                  onPress={() => router.push({ pathname: '/crm/customers/[id]', params: { id: item.convertedToCustomerId! } })}
                />
              ) : (
                <DetailField label={t('crm.convertedTo')} value={t('crm.convertedYes')} />
              )
            ) : null}
            <DetailField label={t('detail.createdAt')} value={formatDateTime(item.createdAt)} />
            {item.notes ? <DetailField label={t('detail.notes')} value={item.notes} /> : null}
          </Card>

          <ActivitiesSection leadId={item.id} />
          <DocumentsPanel entityType="Lead" entityId={item.id} />
        </>
      )}
    </DetailScreen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
})
