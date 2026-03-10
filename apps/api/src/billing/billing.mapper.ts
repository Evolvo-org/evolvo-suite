import type {
  BillingWebhookEvent,
  StripeCustomer,
  Subscription,
} from '@repo/db/client';
import type {
  BillingPortalSessionResponse,
  BillingStatusResponse,
  BillingSubscriptionRecord,
  BillingSubscriptionStatus,
  StripeCustomerMappingRecord,
} from '@repo/shared';

const mapSubscriptionStatus = (
  value: Subscription['status'],
): BillingSubscriptionStatus => {
  switch (value) {
    case 'TRIALING':
      return 'trialing';
    case 'ACTIVE':
      return 'active';
    case 'PAST_DUE':
      return 'pastDue';
    case 'CANCELED':
      return 'canceled';
    default:
      return 'incomplete';
  }
};

export const mapStripeCustomer = (
  customer: StripeCustomer,
): StripeCustomerMappingRecord => ({
  id: customer.id,
  workspaceKey: customer.workspaceKey,
  stripeCustomerId: customer.stripeCustomerId,
  email: customer.email,
  displayName: customer.displayName,
  createdAt: customer.createdAt.toISOString(),
  updatedAt: customer.updatedAt.toISOString(),
});

export const mapSubscription = (
  subscription: Subscription,
): BillingSubscriptionRecord => ({
  id: subscription.id,
  workspaceKey: subscription.workspaceKey,
  stripeSubscriptionId: subscription.stripeSubscriptionId,
  status: mapSubscriptionStatus(subscription.status),
  planKey: subscription.planKey,
  currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  adminBypassActive: subscription.adminBypassActive,
  createdAt: subscription.createdAt.toISOString(),
  updatedAt: subscription.updatedAt.toISOString(),
});

export const mapBillingStatus = (params: {
  workspaceKey: string;
  customer: StripeCustomer | null;
  subscription: Subscription | null;
  adminBypassEnabled: boolean;
  portalSupported: boolean;
  lastWebhookEvent: BillingWebhookEvent | null;
}): BillingStatusResponse => {
  const subscription = params.subscription ? mapSubscription(params.subscription) : null;
  const accessGranted =
    params.adminBypassEnabled ||
    subscription?.adminBypassActive === true ||
    subscription?.status === 'active' ||
    subscription?.status === 'trialing';

  return {
    workspaceKey: params.workspaceKey,
    customer: params.customer ? mapStripeCustomer(params.customer) : null,
    subscription,
    adminBypassEnabled: params.adminBypassEnabled,
    accessGranted,
    portalSupported: params.portalSupported,
    lastWebhookReceivedAt: params.lastWebhookEvent?.receivedAt.toISOString() ?? null,
  };
};

export const mapBillingPortalSession = (params: {
  workspaceKey: string;
  sessionId: string;
  url: string;
  stripeCustomerId: string;
  createdAt: Date;
}): BillingPortalSessionResponse => ({
  workspaceKey: params.workspaceKey,
  sessionId: params.sessionId,
  url: params.url,
  stripeCustomerId: params.stripeCustomerId,
  createdAt: params.createdAt.toISOString(),
});
