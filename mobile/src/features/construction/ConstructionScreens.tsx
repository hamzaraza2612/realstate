import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Card, DetailField, DetailScreen, LinkField, PagedList, PagedSection, RecordCard, Screen, SearchField, SectionRow, StatCard, StatusBadge, StatusFilter, Text } from '@/components'
import { DocumentsPanel } from '@/features/documents/DocumentsPanel'
import { ModuleHubScreen } from '@/features/work/ModuleHubScreen'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { spacing } from '@/theme'
import {
  ConstructionTaskPriorityLabel,
  ConstructionTaskStatusLabel,
  DocumentCategory,
  ExpenseCategoryLabel,
  ExpenseStatusLabel,
  WorkPackageStatusLabel,
  type ExpenseStatus,
  type WorkPackageStatus,
} from '@/types/modules'
import { formatDateTime, formatDay, formatNumber, money, moneyExact } from '@/utils/format'
import { useConstructionTasks, useExpense, useExpenses, useWorkPackage, useWorkPackages } from './api'

export function ConstructionHubScreen() {
  return (
    <ModuleHubScreen
      titleKey="module.construction"
      descriptionKey="module.construction.description"
      sections={[
        { key: 'expenses', labelKey: 'construction.expenses.title', descriptionKey: 'construction.expenses.description', icon: 'wallet-outline', href: '/construction/expenses', permission: 'construction.view' },
        { key: 'workPackages', labelKey: 'construction.workPackages.title', descriptionKey: 'construction.workPackages.description', icon: 'construct-outline', href: '/construction/work-packages', permission: 'construction.view' },
      ]}
    />
  )
}

/** Expenses — `GET /construction/expenses` with its `status` filter (the endpoint has no search). */
export function ExpensesListScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const [status, setStatus] = useState<ExpenseStatus | undefined>()
  const expenses = useExpenses({ status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={expenses}
        header={<StatusFilter labels={ExpenseStatusLabel} value={status} onChange={setStatus} />}
        keyExtractor={(expense) => expense.id}
        emptyIcon="wallet-outline"
        emptyTitle={t('construction.expenses.empty')}
        errorMessage={t('construction.expenses.loadError')}
        renderItem={(expense) => (
          <RecordCard
            title={`${enumLabel(ExpenseCategoryLabel, expense.category)} · ${expense.projectName}`}
            subtitle={[expense.vendorName, expense.workPackageName, expense.referenceNumber].filter(Boolean).join(' · ') || null}
            meta={formatDay(expense.expenseDate)}
            badge={<StatusBadge status={expense.status} labels={ExpenseStatusLabel} />}
            amount={money(expense.amount)}
            onPress={() => router.push({ pathname: '/construction/expenses/[id]', params: { id: expense.id } })}
          />
        )}
      />
    </Screen>
  )
}

/** One expense, plus its documents — the natural place to photograph and attach a receipt
 * (the upload sheet defaults the category to "Receipt"). Approval happens through the Approvals
 * inbox (the existing generic approval request), not a second mechanism here. */
export function ExpenseDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const expense = useExpense(id)
  const canViewProjects = usePermission('projects.view')

  return (
    <DetailScreen query={expense} errorMessage={t('construction.expenses.loadError')}>
      {(item) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <Text variant="heading" style={styles.flex}>
                {enumLabel(ExpenseCategoryLabel, item.category)}
              </Text>
              <StatusBadge status={item.status} labels={ExpenseStatusLabel} />
            </View>
            {canViewProjects ? (
              <LinkField label={t('construction.project')} value={item.projectName} icon="folder-open-outline" onPress={() => router.push({ pathname: '/projects/[id]', params: { id: item.projectId } })} />
            ) : (
              <DetailField label={t('construction.project')} value={item.projectName} />
            )}
            {item.workPackageId ? (
              <LinkField
                label={t('construction.workPackage')}
                value={item.workPackageName ?? '—'}
                icon="construct-outline"
                onPress={() => router.push({ pathname: '/construction/work-packages/[id]', params: { id: item.workPackageId! } })}
              />
            ) : null}
            <DetailField label={t('construction.vendor')} value={item.vendorName} />
            <DetailField label={t('construction.expenseDate')} value={formatDay(item.expenseDate)} />
            <DetailField label={t('construction.reference')} value={item.referenceNumber} />
            {item.notes ? <DetailField label={t('detail.notes')} value={item.notes} /> : null}
            <DetailField label={t('detail.createdAt')} value={formatDateTime(item.createdAt)} />
          </Card>
          <View style={styles.stats}>
            <StatCard label={t('construction.amount')} value={moneyExact(item.amount)} />
            <StatCard label={t('construction.paidAmount')} value={moneyExact(item.paidAmount)} />
          </View>
          <DocumentsPanel entityType="Expense" entityId={item.id} defaultCategory={DocumentCategory.Receipt} />
        </>
      )}
    </DetailScreen>
  )
}

/** Work packages — `GET /construction/work-packages` with `search` and `status` filters. */
export function WorkPackagesListScreen() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<WorkPackageStatus | undefined>()
  const workPackages = useWorkPackages({ search, status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={workPackages}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('construction.workPackages.search')} />
            <StatusFilter labels={WorkPackageStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(wp) => wp.id}
        emptyIcon="construct-outline"
        emptyTitle={t('construction.workPackages.empty')}
        errorMessage={t('construction.workPackages.loadError')}
        renderItem={(wp) => (
          <RecordCard
            title={`${wp.code} · ${wp.name}`}
            subtitle={wp.projectName}
            meta={t('construction.progressTasks', { percent: formatNumber(wp.progressPercent), tasks: formatNumber(wp.taskCount) })}
            badge={<StatusBadge status={wp.status} labels={WorkPackageStatusLabel} />}
            onPress={() => router.push({ pathname: '/construction/work-packages/[id]', params: { id: wp.id } })}
          />
        )}
      />
    </Screen>
  )
}

/** One work package and its tasks (`GET /construction/tasks?workPackageId=`, paged). */
export function WorkPackageDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const workPackage = useWorkPackage(id)
  const tasks = useConstructionTasks(id)
  const canViewProjects = usePermission('projects.view')

  return (
    <DetailScreen query={workPackage} errorMessage={t('construction.workPackages.loadError')} refetchAlso={[tasks]}>
      {(item) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <Text variant="heading">{item.name}</Text>
                <Text variant="bodySmall" color="mutedForeground">
                  {item.code}
                </Text>
              </View>
              <StatusBadge status={item.status} labels={WorkPackageStatusLabel} />
            </View>
            {item.description ? <Text variant="body">{item.description}</Text> : null}
            {canViewProjects ? (
              <LinkField label={t('construction.project')} value={item.projectName} icon="folder-open-outline" onPress={() => router.push({ pathname: '/projects/[id]', params: { id: item.projectId } })} />
            ) : (
              <DetailField label={t('construction.project')} value={item.projectName} />
            )}
            <DetailField label={t('construction.manager')} value={item.managerUserName} />
            <DetailField label={t('construction.planned')} value={`${formatDay(item.plannedStartDate)} → ${formatDay(item.plannedEndDate)}`} />
            <DetailField label={t('construction.actual')} value={`${formatDay(item.actualStartDate)} → ${formatDay(item.actualEndDate)}`} />
          </Card>
          <View style={styles.stats}>
            <StatCard label={t('construction.progressLabel')} value={`${formatNumber(item.progressPercent)}%`} />
            <StatCard label={t('construction.budget')} value={money(item.budget)} />
          </View>
          <PagedSection
            title={t('construction.tasks.title')}
            query={tasks}
            keyExtractor={(task) => task.id}
            emptyText={t('construction.tasks.empty')}
            errorMessage={t('construction.tasks.loadError')}
            renderItem={(task) => (
              <SectionRow
                title={task.title}
                subtitle={[
                  enumLabel(ConstructionTaskPriorityLabel, task.priority),
                  t('construction.progress', { percent: formatNumber(task.progressPercent) }),
                  task.assignedToUserName,
                  task.plannedEndDate ? t('construction.dueOn', { date: formatDay(task.plannedEndDate) }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                trailing={<StatusBadge status={task.status} labels={ConstructionTaskStatusLabel} />}
              />
            )}
          />
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
