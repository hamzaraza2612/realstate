import { StyleSheet, View } from 'react-native'
import { BottomSheet, Button, DetailField, RecordCard, StatusBadge } from '@/components'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { spacing } from '@/theme'
import { MaintenanceCategoryLabel, MaintenancePriorityLabel, MaintenanceStatusLabel, type MaintenanceRequestDto } from '@/types/modules'
import { formatDateTime, formatDay } from '@/utils/format'

function locationOf(request: MaintenanceRequestDto): string {
  const place = request.facilityName ?? request.propertyName
  const unit = request.unitNumber ?? request.spaceCode
  return unit ? `${place} · ${unit}` : place
}

/** One maintenance request as a list card (tenant requests, an owner's properties' requests, a
 * vendor's assigned work — the same `MaintenanceRequestDto` on all three portal endpoints). */
export function MaintenanceRequestCard({ request, onPress }: { request: MaintenanceRequestDto; onPress: () => void }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  return (
    <RecordCard
      title={`${request.requestNumber} · ${locationOf(request)}`}
      subtitle={request.description}
      meta={`${enumLabel(MaintenanceCategoryLabel, request.category)} · ${t('property.priorityValue', { priority: enumLabel(MaintenancePriorityLabel, request.priority) })} · ${formatDay(request.reportedDate)}`}
      badge={<StatusBadge status={request.status} labels={MaintenanceStatusLabel} />}
      onPress={onPress}
    />
  )
}

/**
 * The full request, from the row the list endpoint already returned. The portal exposes no
 * `GET maintenance-requests/{id}`, so rather than invent one the detail is a sheet over the
 * list data — every field shown is a real field of that row.
 */
export function MaintenanceRequestSheet({ request, onClose }: { request: MaintenanceRequestDto | null; onClose: () => void }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  return (
    <BottomSheet visible={!!request} title={request ? request.requestNumber : ''} onClose={onClose}>
      {request ? (
        <View style={styles.body}>
          <StatusBadge status={request.status} labels={MaintenanceStatusLabel} />
          <DetailField label={t('portal.maintenance.location')} value={locationOf(request)} />
          <DetailField label={t('portal.maintenance.issue')} value={request.description} />
          <DetailField label={t('property.category')} value={enumLabel(MaintenanceCategoryLabel, request.category)} />
          <DetailField label={t('property.priority')} value={enumLabel(MaintenancePriorityLabel, request.priority)} />
          <DetailField label={t('property.reportedDate')} value={formatDay(request.reportedDate)} />
          {request.rentalTenantName ? <DetailField label={t('property.tenant')} value={request.rentalTenantName} /> : null}
          {request.assignedVendorName || request.assignedToUserName ? (
            <DetailField label={t('property.assignedTo')} value={request.assignedVendorName ?? request.assignedToUserName} />
          ) : null}
          {request.slaDueAt ? <DetailField label={t('property.slaDue')} value={formatDateTime(request.slaDueAt)} /> : null}
          {request.completionDate ? <DetailField label={t('property.completionDate')} value={formatDay(request.completionDate)} /> : null}
          {request.resolutionNotes ? <DetailField label={t('property.resolutionNotes')} value={request.resolutionNotes} /> : null}
          <Button label={t('common.close')} variant="outline" onPress={onClose} fullWidth />
        </View>
      ) : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  body: { gap: spacing.md },
})
