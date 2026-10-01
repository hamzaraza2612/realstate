import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useApiGet, usePagedList } from '@/api/paging'
import { Card, DetailField, DetailScreen, PagedList, PagedSection, RecordCard, Screen, SearchField, SectionRow, StatCard, StatusBadge, StatusFilter, Text } from '@/components'
import { useWorkPackages } from '@/features/construction/api'
import { DocumentsPanel } from '@/features/documents/DocumentsPanel'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { spacing } from '@/theme'
import { ProjectStatusLabel, ProjectTypeLabel, WorkPackageStatusLabel, type ProjectDto, type ProjectStatus } from '@/types/modules'
import { formatDay, formatNumber } from '@/utils/format'

/**
 * Projects — the web `modules/projects` endpoints:
 *   GET /projects?search=&status=&page=&pageSize=   (projects.view)
 *   GET /projects/{id}                               (projects.view)
 */

const PROJECTS_KEY = ['projects']

export function ProjectsListScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ProjectStatus | undefined>()
  const projects = usePagedList<ProjectDto>(PROJECTS_KEY, '/projects', { search, status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={projects}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('projects.search')} />
            <StatusFilter labels={ProjectStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(project) => project.id}
        emptyIcon="folder-open-outline"
        emptyTitle={t('projects.empty')}
        errorMessage={t('projects.loadError')}
        renderItem={(project) => (
          <RecordCard
            title={project.name}
            subtitle={`${project.code} · ${enumLabel(ProjectTypeLabel, project.type)}`}
            meta={[project.city, project.country].filter(Boolean).join(', ') || null}
            badge={<StatusBadge status={project.status} labels={ProjectStatusLabel} />}
            onPress={() => router.push({ pathname: '/projects/[id]', params: { id: project.id } })}
          />
        )}
      />
    </Screen>
  )
}

/** One project: its fields and counts, its construction work packages (with `construction.view`,
 * `GET /construction/work-packages?projectId=`), and attached documents. */
export function ProjectDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const project = useApiGet<ProjectDto>([...PROJECTS_KEY, 'detail', id], `/projects/${id}`)
  const canViewConstruction = usePermission('construction.view')
  const workPackages = useWorkPackages({ projectId: id }, canViewConstruction)

  return (
    <DetailScreen query={project} errorMessage={t('projects.loadError')} refetchAlso={canViewConstruction ? [workPackages] : []}>
      {(item) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <Text variant="heading">{item.name}</Text>
                <Text variant="bodySmall" color="mutedForeground">
                  {item.code} · {enumLabel(ProjectTypeLabel, item.type)}
                </Text>
              </View>
              <StatusBadge status={item.status} labels={ProjectStatusLabel} />
            </View>
            {item.description ? <Text variant="body">{item.description}</Text> : null}
            <DetailField
              label={t('detail.address')}
              value={[item.addressLine, item.city, item.state, item.country, item.postalCode].filter(Boolean).join(', ')}
            />
            <DetailField label={t('projects.startDate')} value={formatDay(item.startDate)} />
            <DetailField label={t('projects.endDate')} value={formatDay(item.endDate)} />
          </Card>

          <View style={styles.stats}>
            <StatCard label={t('projects.nodes')} value={formatNumber(item.nodeCount)} icon="git-network-outline" />
            <StatCard label={t('projects.inventory')} value={formatNumber(item.inventoryCount)} icon="grid-outline" />
          </View>

          {canViewConstruction ? (
            <PagedSection
              title={t('construction.workPackages.title')}
              query={workPackages}
              keyExtractor={(wp) => wp.id}
              emptyText={t('construction.workPackages.empty')}
              errorMessage={t('construction.workPackages.loadError')}
              renderItem={(wp) => (
                <SectionRow
                  title={`${wp.code} · ${wp.name}`}
                  subtitle={t('construction.progress', { percent: formatNumber(wp.progressPercent) })}
                  trailing={<StatusBadge status={wp.status} labels={WorkPackageStatusLabel} />}
                  onPress={() => router.push({ pathname: '/construction/work-packages/[id]', params: { id: wp.id } })}
                />
              )}
            />
          ) : null}

          <DocumentsPanel entityType="Project" entityId={item.id} />
        </>
      )}
    </DetailScreen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
})
