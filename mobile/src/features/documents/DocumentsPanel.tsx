import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { extractErrorMessage } from '@/api/apiClient'
import { Badge, Button, Icon, PagedSection, Text, useToast } from '@/components'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { HIT_TARGET, spacing, useTheme } from '@/theme'
import { DocumentCategory, DocumentCategoryLabel, type DocumentDto } from '@/types/modules'
import { formatDateTime } from '@/utils/format'
import { openDocument, useEntityDocuments } from './api'
import { UploadDocumentSheet } from './UploadDocumentSheet'

/**
 * Drop-in "Documents" card for any record's detail screen — the mobile take on the web
 * `modules/documents/DocumentsPanel.tsx`: the record's attached files (paged), tap to open/share
 * the latest version, and (with `documents.manage`) attach a new one from the camera, gallery or
 * files. Renders nothing for a user without `documents.view` (the API would 403 anyway).
 * `entityType` must be one of the backend's `DocumentEntityTypes` (Lead, Customer, Booking, …).
 */
export function DocumentsPanel({
  entityType,
  entityId,
  defaultCategory,
}: {
  entityType: string
  entityId: string
  defaultCategory?: DocumentCategory
}) {
  const { t } = useI18n()
  const canView = usePermission('documents.view')
  const canManage = usePermission('documents.manage')
  const { isOffline } = useNetworkStatus()
  const documents = useEntityDocuments(entityType, entityId, canView)
  const [uploadOpen, setUploadOpen] = useState(false)

  if (!canView) return null

  return (
    <>
      <PagedSection
        title={t('documents.title')}
        query={documents}
        keyExtractor={(doc) => doc.id}
        emptyText={t('documents.empty')}
        errorMessage={t('documents.loadError')}
        action={
          canManage ? (
            <Button label={t('documents.attach')} icon="add" size="sm" onPress={() => setUploadOpen(true)} disabled={isOffline} />
          ) : undefined
        }
        renderItem={(doc) => <DocumentRow document={doc} />}
      />
      {canManage ? (
        <UploadDocumentSheet
          visible={uploadOpen}
          entityType={entityType}
          entityId={entityId}
          defaultCategory={defaultCategory}
          onClose={() => setUploadOpen(false)}
        />
      ) : null}
    </>
  )
}

function DocumentRow({ document }: { document: DocumentDto }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const { colors } = useTheme()
  const toast = useToast()
  const { isOffline } = useNetworkStatus()
  const [opening, setOpening] = useState(false)

  async function open() {
    if (opening) return
    setOpening(true)
    try {
      await openDocument(document)
    } catch (error) {
      toast({ title: t('documents.openError'), description: extractErrorMessage(error, t('common.somethingWentWrong')), variant: 'error' })
    } finally {
      setOpening(false)
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${document.title}. ${t('documents.open')}`}
      accessibilityState={{ disabled: isOffline, busy: opening }}
      onPress={open}
      disabled={isOffline}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
        <Icon name="document-text-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.text}>
        <Text variant="body" numberOfLines={1}>
          {document.title}
        </Text>
        <Text variant="caption" color="mutedForeground" numberOfLines={1}>
          {t('documents.versionBy', { version: document.latestVersionNumber, name: document.createdByUserName ?? '—' })} · {formatDateTime(document.createdAt)}
        </Text>
        <Badge label={enumLabel(DocumentCategoryLabel, document.category)} />
      </View>
      {opening ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="download-outline" size={20} color={isOffline ? colors.mutedForeground : colors.primary} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { minHeight: HIT_TARGET + 12, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
})
