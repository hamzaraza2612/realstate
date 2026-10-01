import type { PortalActorType } from '@/types/api'

/**
 * The five external-portal areas — one per `PortalProfile.actorType`, exactly the backend's
 * `Portal{Customer,Tenant,Owner,Vendor,Member}Controller` route prefixes. A portal session belongs to
 * exactly one actor type, so the app shows exactly one area; the backend's `PortalControllerBase`
 * rejects a token pointed at another area's endpoints with 403 regardless of what the client does.
 *
 * The "Agent" actor from the milestone's list is deliberately NOT here: `AgentPortalController` is
 * plain internal `[Authorize]` (a Sales Agent uses their staff login), so it lives in the internal
 * app (`app/(internal)/agent/`), never in the portal route group.
 */
export interface PortalArea {
  actorType: PortalActorType
  /** Path segment of both the API prefix (`/portal/<slug>/…`) and the app route (`/portal/<slug>`). */
  slug: 'customer' | 'tenant' | 'owner' | 'vendor' | 'member'
  /** API path prefix, relative to `API_BASE_URL` — used only with `portalApiClient`. */
  apiPrefix: string
  /** Expo Router base path of this area's screens. */
  routeBase: string
}

function area(actorType: PortalActorType, slug: PortalArea['slug']): PortalArea {
  return { actorType, slug, apiPrefix: `/portal/${slug}`, routeBase: `/portal/${slug}` }
}

export const PORTAL_AREAS: Record<PortalActorType, PortalArea> = {
  Customer: area('Customer', 'customer'),
  RentalTenant: area('RentalTenant', 'tenant'),
  PropertyOwner: area('PropertyOwner', 'owner'),
  Vendor: area('Vendor', 'vendor'),
  CoworkingMember: area('CoworkingMember', 'member'),
}
