export const billingSubscriptionStatuses = [
  'trialing',
  'active',
  'pastDue',
  'canceled',
  'incomplete',
] as const;
export type BillingSubscriptionStatus =
  (typeof billingSubscriptionStatuses)[number];

export interface UpsertStripeCustomerMappingRequest {
  workspaceKey?: string;
  stripeCustomerId: string;
  email?: string;
  displayName?: string;
}

export interface UpsertBillingSubscriptionRequest {
  workspaceKey?: string;
  stripeSubscriptionId?: string;
  status: BillingSubscriptionStatus;
  planKey?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  adminBypassActive?: boolean;
}

export interface CreateBillingPortalSessionRequest {
  workspaceKey?: string;
  returnUrl?: string;
}

export interface StripeWebhookEventRequest {
  eventId: string;
  eventType: string;
  workspaceKey?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status?: BillingSubscriptionStatus;
  planKey?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  email?: string;
  displayName?: string;
  adminBypassActive?: boolean;
  payloadJson?: string;
}

export interface StripeCustomerMappingRecord {
  id: string;
  workspaceKey: string;
  stripeCustomerId: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSubscriptionRecord {
  id: string;
  workspaceKey: string;
  stripeSubscriptionId: string | null;
  status: BillingSubscriptionStatus;
  planKey: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  adminBypassActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingPortalSessionResponse {
  workspaceKey: string;
  sessionId: string;
  url: string;
  stripeCustomerId: string;
  createdAt: string;
}

export interface BillingStatusResponse {
  workspaceKey: string;
  customer: StripeCustomerMappingRecord | null;
  subscription: BillingSubscriptionRecord | null;
  adminBypassEnabled: boolean;
  accessGranted: boolean;
  portalSupported: boolean;
  lastWebhookReceivedAt: string | null;
}
