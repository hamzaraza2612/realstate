import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { extractErrorMessage } from '@/api/apiClient'
import { BottomSheet, Button, Input, PagedSection, SectionRow, Select, StatusBadge, Text, useToast } from '@/components'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { spacing } from '@/theme'
import { ActivityStatus, ActivityType, ActivityTypeLabel, type ActivityDto } from '@/types/modules'
import { formatDateTime } from '@/utils/format'
import { useActivities, useCompleteActivity, useCreateActivity } from './api'

const ActivityStatusLabel: Record<ActivityStatus, string> = {
  [ActivityStatus.Pending]: 'Pending',
  [ActivityStatus.Completed]: 'Completed',
}

/**
 * A lead's / customer's CRM activities (`GET /crm/activities?leadId=|customerId=`, paged), with the
 * two existing write actions: log a new activity (`POST /crm/activities` — e.g. right after calling
 * the lead from the Call button) and mark a pending one done (`POST /crm/activities/{id}/complete`).
 * Hidden without `crm.activity.view`; the write buttons need `crm.activity.manage`.
 */
export function ActivitiesSection({ leadId, customerId }: { leadId?: string; customerId?: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const toast = useToast()
  const { isOffline } = useNetworkStatus()
  const canView = usePermission('crm.activity.view')
  const canManage = usePermission('crm.activity.manage')
  const activities = useActivities({ leadId, customerId }, canView)
  const complete = useCompleteActivity()
  const [logOpen, setLogOpen] = useState(false)

  if (!canView) return null

  async function markDone(activity: ActivityDto) {
    try {
      await complete.mutateAsync(activity.id)
      toast({ title: t('crm.activities.completed'), variant: 'success' })
    } catch (error) {
      toast({ title: t('crm.activities.actionError'), description: extractErrorMessage(error, t('common.somethingWentWrong')), variant: 'error' })
    }
  }

  return (
    <>
      <PagedSection
        title={t('crm.activities.title')}
        query={activities}
        keyExtractor={(activity) => activity.id}
        emptyText={t('crm.activities.empty')}
        errorMessage={t('crm.activities.loadError')}
        action={canManage ? <Button label={t('crm.activities.log')} icon="add" size="sm" onPress={() => setLogOpen(true)} disabled={isOffline} /> : undefined}
        renderItem={(activity) => (
          <SectionRow
            title={activity.subject}
            subtitle={[
              enumLabel(ActivityTypeLabel, activity.type),
              activity.dueDate ? t('crm.activities.due', { date: formatDateTime(activity.dueDate) }) : null,
              activity.assignedToUserName,
            ]
              .filter(Boolean)
              .join(' · ')}
            trailing={<StatusBadge status={activity.status} labels={ActivityStatusLabel} />}
            footer={
              <>
                {activity.description ? (
                  <Text variant="bodySmall" color="mutedForeground" numberOfLines={3}>
                    {activity.description}
                  </Text>
                ) : null}
                {canManage && activity.status === ActivityStatus.Pending ? (
                  <View style={styles.rowAction}>
                    <Button
                      label={t('crm.activities.markDone')}
                      icon="checkmark"
                      variant="outline"
                      size="sm"
                      onPress={() => markDone(activity)}
                      loading={complete.isPending && complete.variables === activity.id}
                      disabled={isOffline}
                    />
                  </View>
                ) : null}
              </>
            }
          />
        )}
      />
      {canManage ? <LogActivitySheet visible={logOpen} leadId={leadId} customerId={customerId} onClose={() => setLogOpen(false)} /> : null}
    </>
  )
}

function LogActivitySheet({ visible, leadId, customerId, onClose }: { visible: boolean; leadId?: string; customerId?: string; onClose: () => void }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const toast = useToast()
  const { isOffline } = useNetworkStatus()
  const create = useCreateActivity()
  const [type, setType] = useState<ActivityType>(ActivityType.Call)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')

  function close() {
    setType(ActivityType.Call)
    setSubject('')
    setDescription('')
    onClose()
  }

  async function submit() {
    try {
      await create.mutateAsync({ type, subject: subject.trim(), description: description.trim() || null, leadId, customerId })
      toast({ title: t('crm.activities.logged'), variant: 'success' })
      close()
    } catch (error) {
      toast({ title: t('crm.activities.actionError'), description: extractErrorMessage(error, t('common.somethingWentWrong')), variant: 'error' })
    }
  }

  const typeOptions = (Object.keys(ActivityTypeLabel) as unknown as string[]).map((key) => ({
    value: key,
    label: enumLabel(ActivityTypeLabel, Number(key) as ActivityType),
  }))

  return (
    <BottomSheet visible={visible} title={t('crm.activities.logTitle')} onClose={close}>
      <Select label={t('crm.activities.type')} value={String(type)} options={typeOptions} onChange={(value) => setType(Number(value) as ActivityType)} />
      <Input label={t('crm.activities.subject')} value={subject} onChangeText={setSubject} maxLength={200} />
      <Input label={t('crm.activities.description')} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
      {isOffline ? (
        <Text variant="bodySmall" color="destructive">
          {t('offline.actionDisabled')}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button label={t('common.cancel')} variant="outline" onPress={close} style={styles.flex} />
        <Button label={t('common.save')} onPress={submit} loading={create.isPending} disabled={!subject.trim() || isOffline} style={styles.flex} />
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowAction: { flexDirection: 'row', marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
})
