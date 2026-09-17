import { PageHeader } from '@/components/common/PageHeader'
import { AuditLogTable } from './AuditLogTable'

export function AuditLogPage() {
  return (
    <div>
      <PageHeader title="Audit Logs" description="A record of who did what, when, across your organization." />
      <AuditLogTable />
    </div>
  )
}
