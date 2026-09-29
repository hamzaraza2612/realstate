/** Best-effort deep links from an AttentionItemDto/AiActionProposalDto's `entityType` to that
 * entity's existing detail page elsewhere in the ERP. Never invents a new detail page — an
 * entity type with no known route (or no `:id` detail route at all, e.g. Vendor) simply gets no
 * link, and the card falls back to plain text. */
const ENTITY_DETAIL_ROUTES: Record<string, (id: string) => string> = {
  Lead: (id) => `/crm/leads/${id}`,
  Customer: (id) => `/crm/customers/${id}`,
  WorkPackage: (id) => `/construction/work-packages/${id}`,
  Lease: (id) => `/property/leases/${id}`,
  MaintenanceRequest: (id) => `/property/maintenance/${id}`,
}

export function entityDetailRoute(entityType: string | null | undefined, entityId: string | null | undefined): string | null {
  if (!entityType || !entityId) return null
  const build = ENTITY_DETAIL_ROUTES[entityType]
  return build ? build(entityId) : null
}
