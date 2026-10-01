import { useApiGet, usePagedList } from '@/api/paging'
import type { ConstructionTaskDto, ExpenseDto, ExpenseStatus, WorkPackageDto, WorkPackageStatus } from '@/types/modules'

/**
 * Construction — the web `modules/construction` endpoints (all `construction.view`):
 *   GET /construction/work-packages?search=&status=&projectId=&page=&pageSize=
 *   GET /construction/work-packages/{id}
 *   GET /construction/tasks?workPackageId=&page=&pageSize=
 *   GET /construction/expenses?status=&projectId=&page=&pageSize=   (no search param on this endpoint)
 *   GET /construction/expenses/{id}
 */

export const CONSTRUCTION_KEY = ['construction']

export function useWorkPackages(params: { search?: string; status?: WorkPackageStatus; projectId?: string }, enabled = true) {
  return usePagedList<WorkPackageDto>([...CONSTRUCTION_KEY, 'work-packages'], '/construction/work-packages', params, { enabled })
}

export function useWorkPackage(id: string) {
  return useApiGet<WorkPackageDto>([...CONSTRUCTION_KEY, 'work-packages', 'detail', id], `/construction/work-packages/${id}`)
}

export function useConstructionTasks(workPackageId: string) {
  return usePagedList<ConstructionTaskDto>([...CONSTRUCTION_KEY, 'tasks'], '/construction/tasks', { workPackageId })
}

export function useExpenses(params: { status?: ExpenseStatus; projectId?: string }) {
  return usePagedList<ExpenseDto>([...CONSTRUCTION_KEY, 'expenses'], '/construction/expenses', params)
}

export function useExpense(id: string) {
  return useApiGet<ExpenseDto>([...CONSTRUCTION_KEY, 'expenses', 'detail', id], `/construction/expenses/${id}`)
}
