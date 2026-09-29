import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { formatNumber } from '@/lib/utils'

/** The shared "Page X of Y · N items · Previous/Next" footer for paginated list pages (Milestone
 * 17), replacing the markup that used to be hand-copied into every list page. The chevrons
 * mirror in RTL. */
export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  itemLabel,
}: {
  page: number
  totalPages: number
  /** Total record count across all pages, if known. */
  total?: number
  onPageChange: (page: number) => void
  /** Plural noun for the records, e.g. "leads" — shown after the total. */
  itemLabel?: string
}) {
  const { t } = useI18n()
  const summary = t('pagination.pageOf').replace('{page}', String(page)).replace('{totalPages}', String(totalPages))

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>
        {summary}
        {total != null && (
          <>
            {' · '}
            {formatNumber(total)} {itemLabel ?? t('pagination.items')}
          </>
        )}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t('common.previous')}
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          {t('common.next')}
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  )
}
