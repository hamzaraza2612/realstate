import { PageHeader } from '@/components/common/PageHeader'
import { AuditLogTable } from '@/modules/audit/AuditLogTable'

export function PlatformAuditLogsPage() {
  return (
    <div>
      <PageHeader title="Platform Audit Log" description="Every administrative action across every tenant on the platform." />
      <AuditLogTable basePath="/platform/audit-logs" />
    </div>
  )
}
