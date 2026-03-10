import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  BillingPortalSessionResponse,
  BillingStatusResponse,
  BillingSubscriptionRecord,
  StripeCustomerMappingRecord,
  StripeWebhookEventRequest,
  UpsertBillingSubscriptionRequest,
  UpsertStripeCustomerMappingRequest,
} from '@repo/shared';

import type { ApplicationEnvironment } from '../config/environment.js';
import { LogsService } from '../logs/logs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

import {
  mapBillingPortalSession,
  mapBillingStatus,
  mapStripeCustomer,
  mapSubscription,
} from './billing.mapper.js';

const defaultWorkspaceKey = 'default';

const toPrismaSubscriptionStatus = (
  value: UpsertBillingSubscriptionRequest['status'],
) => {
  switch (value) {
    case 'trialing':
      return 'TRIALING' as const;
    case 'active':
      return 'ACTIVE' as const;
    case 'pastDue':
      return 'PAST_DUE' as const;
    case 'canceled':
      return 'CANCELED' as const;
    default:
      return 'INCOMPLETE' as const;
  }
};

@Injectable()
export class BillingService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ConfigService)
    private readonly configService: ConfigService<ApplicationEnvironment, true>,
    @Inject(LogsService)
    private readonly logsService: LogsService,
  ) {}

  public async upsertCustomer(
    payload: UpsertStripeCustomerMappingRequest,
  ): Promise<StripeCustomerMappingRecord> {
    const workspaceKey = payload.workspaceKey?.trim() ?? defaultWorkspaceKey;

    const customer = await this.prisma.stripeCustomer.upsert({
      where: { workspaceKey },
      create: {
        workspaceKey,
        stripeCustomerId: payload.stripeCustomerId.trim(),
        email: payload.email?.trim(),
        displayName: payload.displayName?.trim(),
      },
      update: {
        stripeCustomerId: payload.stripeCustomerId.trim(),
        email: payload.email?.trim() ?? null,
        displayName: payload.displayName?.trim() ?? null,
      },
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'billing',
      eventType: 'billing.customer.upserted',
      message: `Stripe customer mapping updated for workspace ${workspaceKey}.`,
      payload: {
        workspaceKey,
        stripeCustomerId: customer.stripeCustomerId,
      },
    });

    return mapStripeCustomer(customer);
  }

  public async upsertSubscription(
    payload: UpsertBillingSubscriptionRequest,
  ): Promise<BillingSubscriptionRecord> {
    const workspaceKey = payload.workspaceKey?.trim() ?? defaultWorkspaceKey;
    const customer = await this.prisma.stripeCustomer.findUnique({
      where: { workspaceKey },
    });

    if (!customer) {
      throw new NotFoundException('Stripe customer mapping not found.');
    }

    const subscription = await this.prisma.subscription.upsert({
      where: { workspaceKey },
      create: {
        workspaceKey,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: payload.stripeSubscriptionId?.trim(),
        status: toPrismaSubscriptionStatus(payload.status),
        planKey: payload.planKey?.trim(),
        currentPeriodEnd: payload.currentPeriodEnd
          ? new Date(payload.currentPeriodEnd)
          : null,
        cancelAtPeriodEnd: payload.cancelAtPeriodEnd ?? false,
        adminBypassActive: payload.adminBypassActive ?? false,
      },
      update: {
        stripeCustomerId: customer.id,
        stripeSubscriptionId: payload.stripeSubscriptionId?.trim() ?? null,
        status: toPrismaSubscriptionStatus(payload.status),
        planKey: payload.planKey?.trim() ?? null,
        currentPeriodEnd: payload.currentPeriodEnd
          ? new Date(payload.currentPeriodEnd)
          : null,
        cancelAtPeriodEnd: payload.cancelAtPeriodEnd ?? false,
        adminBypassActive: payload.adminBypassActive ?? false,
      },
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'billing',
      eventType: 'billing.subscription.upserted',
      message: `Subscription updated for workspace ${workspaceKey}.`,
      payload: {
        workspaceKey,
        status: payload.status,
        planKey: subscription.planKey,
        adminBypassActive: subscription.adminBypassActive,
      },
    });

    return mapSubscription(subscription);
  }

  public async getBillingStatus(
    workspaceKey = defaultWorkspaceKey,
  ): Promise<BillingStatusResponse> {
    const normalizedWorkspaceKey = workspaceKey.trim();
    const [customer, subscription, lastWebhookEvent] = await Promise.all([
      this.prisma.stripeCustomer.findUnique({
        where: { workspaceKey: normalizedWorkspaceKey },
      }),
      this.prisma.subscription.findUnique({
        where: { workspaceKey: normalizedWorkspaceKey },
      }),
      this.prisma.billingWebhookEvent.findFirst({
        where: { workspaceKey: normalizedWorkspaceKey },
        orderBy: { receivedAt: 'desc' },
      }),
    ]);

    return mapBillingStatus({
      workspaceKey: normalizedWorkspaceKey,
      customer,
      subscription,
      adminBypassEnabled: this.getAdminBypassEnabled(),
      portalSupported: this.getPortalSupported(),
      lastWebhookEvent,
    });
  }

  public async createPortalSession(params?: {
    workspaceKey?: string;
    returnUrl?: string;
  }): Promise<BillingPortalSessionResponse> {
    const workspaceKey = params?.workspaceKey?.trim() ?? defaultWorkspaceKey;
    const customer = await this.prisma.stripeCustomer.findUnique({
      where: { workspaceKey },
    });

    if (!customer) {
      throw new NotFoundException('Stripe customer mapping not found.');
    }

    const sessionId = `bps_${randomUUID()}`;
    const returnUrl = params?.returnUrl?.trim() || 'http://localhost:3000/settings/billing';
    const url = `${returnUrl.replace(/\/$/, '')}?billingSession=${sessionId}`;

    await this.logsService.writeLog({
      level: 'info',
      source: 'billing',
      eventType: 'billing.portal-session.created',
      message: `Billing portal session created for workspace ${workspaceKey}.`,
      payload: {
        workspaceKey,
        sessionId,
      },
    });

    return mapBillingPortalSession({
      workspaceKey,
      sessionId,
      url,
      stripeCustomerId: customer.stripeCustomerId,
      createdAt: new Date(),
    });
  }

  public async handleWebhook(
    payload: StripeWebhookEventRequest,
  ): Promise<BillingStatusResponse> {
    const workspaceKey = payload.workspaceKey?.trim() ?? defaultWorkspaceKey;
    const existing = await this.prisma.billingWebhookEvent.findUnique({
      where: { providerEventId: payload.eventId.trim() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Webhook event has already been processed.');
    }

    await this.prisma.$transaction(async (transaction) => {
      let stripeCustomerId: string | null = null;

      if (payload.stripeCustomerId?.trim()) {
        const customer = await transaction.stripeCustomer.upsert({
          where: { workspaceKey },
          create: {
            workspaceKey,
            stripeCustomerId: payload.stripeCustomerId.trim(),
            email: payload.email?.trim(),
            displayName: payload.displayName?.trim(),
          },
          update: {
            stripeCustomerId: payload.stripeCustomerId.trim(),
            email: payload.email?.trim() ?? undefined,
            displayName: payload.displayName?.trim() ?? undefined,
          },
        });

        stripeCustomerId = customer.id;

        if (payload.status) {
          await transaction.subscription.upsert({
            where: { workspaceKey },
            create: {
              workspaceKey,
              stripeCustomerId: customer.id,
              stripeSubscriptionId: payload.stripeSubscriptionId?.trim(),
              status: toPrismaSubscriptionStatus(payload.status),
              planKey: payload.planKey?.trim(),
              currentPeriodEnd: payload.currentPeriodEnd
                ? new Date(payload.currentPeriodEnd)
                : null,
              cancelAtPeriodEnd: payload.cancelAtPeriodEnd ?? false,
              adminBypassActive: payload.adminBypassActive ?? false,
            },
            update: {
              stripeCustomerId: customer.id,
              stripeSubscriptionId: payload.stripeSubscriptionId?.trim() ?? null,
              status: toPrismaSubscriptionStatus(payload.status),
              planKey: payload.planKey?.trim() ?? null,
              currentPeriodEnd: payload.currentPeriodEnd
                ? new Date(payload.currentPeriodEnd)
                : null,
              cancelAtPeriodEnd: payload.cancelAtPeriodEnd ?? false,
              adminBypassActive: payload.adminBypassActive ?? false,
            },
          });
        }
      }

      await transaction.billingWebhookEvent.create({
        data: {
          workspaceKey,
          stripeCustomerId,
          providerEventId: payload.eventId.trim(),
          eventType: payload.eventType.trim(),
          payloadJson: payload.payloadJson?.trim(),
          processedAt: new Date(),
        },
      });
    });

    await this.logsService.writeLog({
      level: 'info',
      source: 'billing',
      eventType: 'billing.webhook.processed',
      message: `Billing webhook ${payload.eventType.trim()} processed.`,
      payload: {
        workspaceKey,
        eventId: payload.eventId.trim(),
        eventType: payload.eventType.trim(),
        stripeCustomerId: payload.stripeCustomerId?.trim() ?? null,
        stripeSubscriptionId: payload.stripeSubscriptionId?.trim() ?? null,
      },
    });

    return this.getBillingStatus(workspaceKey);
  }

  private getAdminBypassEnabled(): boolean {
    return this.configService.get('billingAdminBypass', { infer: true });
  }

  private getPortalSupported(): boolean {
    const stripeSecretKey = this.configService.get('stripeSecretKey', { infer: true });
    return Boolean(stripeSecretKey?.trim());
  }
}
