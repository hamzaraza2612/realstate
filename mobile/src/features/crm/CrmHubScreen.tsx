import { ModuleHubScreen } from '@/features/work/ModuleHubScreen'

/** CRM landing screen: Leads (`crm.lead.view`) and Customers (`crm.customer.view`) — the same
 * permissions as the web nav's "Leads" / "Customers" items. */
export function CrmHubScreen() {
  return (
    <ModuleHubScreen
      titleKey="module.crm"
      descriptionKey="module.crm.description"
      sections={[
        { key: 'leads', labelKey: 'crm.leads.title', descriptionKey: 'crm.leads.description', icon: 'person-add-outline', href: '/crm/leads', permission: 'crm.lead.view' },
        { key: 'customers', labelKey: 'crm.customers.title', descriptionKey: 'crm.customers.description', icon: 'people-outline', href: '/crm/customers', permission: 'crm.customer.view' },
      ]}
    />
  )
}
