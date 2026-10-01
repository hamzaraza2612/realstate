import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { extractErrorMessage } from '@/api/portalApiClient'
import { Badge, EmptyState, ErrorState, Icon, LastUpdated, LoadingState, PageHeader, Text, useToast } from '@/components'
import { Screen } from '@/components/Screen'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { HIT_TARGET, radius, spacing, useTheme } from '@/theme'
import { DocumentCategoryLabel, type DocumentDto } from '@/types/modules'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { PortalArea } from './areas'
import { openPortalDocument, usePortalDocuments } from './api/common'

/**
 * "Documents" tab of any portal area: the files the organization has attached to the caller's own
 * records (contracts, receipts, statements, …) from `GET {prefix}/documents`, tap to download /
 * share via `GET {prefix}/documents/{id}/download`. Read-only — the portal has no upload endpoint.
 */
export function PortalDocumentsScreen({ area }: { area: PortalArea }) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const documents = usePortalDocuments(area)
  const [refreshing, setRefreshing] = useState(false)
  const items = documents.data ?? []

  async function onRefresh() {
    setRefreshing(true)
    await documents.refetch()
    setRefreshing(false)
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(doc) => doc.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageHeader title={t('documents.title')} description={t('portal.documents.description')} />
            {documents.data ? <LastUpdated updatedAt={documents.dataUpdatedAt} /> : null}
            {items.length > 0 ? (
              <Text variant="caption" color="mutedForeground">
                {t('list.totalCount', { total: formatNumber(items.length) })}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          documents.isLoading ? (
            <LoadingState rows={4} />
          ) : documents.isError ? (
            <ErrorState message={t('documents.loadError')} onRetry={() => documents.refetch()} />
          ) : (
            <EmptyState icon="document-text-outline" title={t('portal.documents.emptyTitle')} description={t('portal.documents.emptyDescription')} />
          )
        }
        renderItem={({ item }) => <PortalDocumentRow area={area} document={item} />}
      />
    </Screen>
  )
}

function PortalDocumentRow({ area, document }: { area: PortalArea; document: DocumentDto }) {
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
      await openPortalDocument(area, document)
    } catch (error) {
      toast({ title: t('documents.openError'), description: extractErrorMessage(error, t('common.somethingWentWrong')), variant: 'error' })
    } finally {
      setOpening(false)
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${document.title}. ${t('portal.documents.download')}`}
      accessibilityState={{ disabled: isOffline, busy: opening }}
      onPress={open}
      disabled={isOffline}
      style={({ pressed }) => [styles.row, { borderColor: colors.border, backgroundColor: colors.card }, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
        <Icon name="document-text-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.text}>
        <Text variant="subheading" numberOfLines={2}>
          {document.title}
        </Text>
        {document.description ? (
          <Text variant="bodySmall" color="mutedForeground" numberOfLines={2}>
            {document.description}
          </Text>
        ) : null}
        <Text variant="caption" color="mutedForeground" numberOfLines={1}>
          {t('portal.documents.versionAdded', { version: formatNumber(document.latestVersionNumber), date: formatDateTime(document.createdAt) })}
        </Text>
        <Badge label={enumLabel(DocumentCategoryLabel, document.category)} />
      </View>
      {opening ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="download-outline" size={22} color={isOffline ? colors.mutedForeground : colors.primary} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  row: {
    minHeight: HIT_TARGET + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
})
