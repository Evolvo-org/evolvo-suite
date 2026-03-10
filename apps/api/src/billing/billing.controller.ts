import { Body, Controller, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { authRoles } from '@repo/shared';
import type {
  CreateBillingPortalSessionRequest,
  StripeWebhookEventRequest,
  UpsertBillingSubscriptionRequest,
  UpsertStripeCustomerMappingRequest,
} from '@repo/shared';
import {
  createBillingPortalSessionSchema,
  stripeWebhookEventSchema,
  upsertBillingSubscriptionSchema,
  upsertStripeCustomerMappingSchema,
} from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { PublicRoute, RequireRoles } from '../auth/auth.decorators.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';

import { BillingService } from './billing.service.js';

@Controller('billing')
export class BillingController {
  public constructor(
    @Inject(BillingService)
    private readonly billingService: BillingService,
  ) {}

  @UseGuards(SessionAuthGuard, RolesGuard)
  @RequireRoles('admin')
  @Put('customer')
  public async upsertCustomer(
    @Body(new ZodValidationPipe(upsertStripeCustomerMappingSchema))
    body: UpsertStripeCustomerMappingRequest,
  ) {
    const customer = await this.billingService.upsertCustomer(body);

    return {
      success: true as const,
      message: 'Stripe customer mapping saved successfully.',
      data: customer,
    };
  }

  @UseGuards(SessionAuthGuard, RolesGuard)
  @RequireRoles('admin')
  @Put('subscription')
  public async upsertSubscription(
    @Body(new ZodValidationPipe(upsertBillingSubscriptionSchema))
    body: UpsertBillingSubscriptionRequest,
  ) {
    const subscription = await this.billingService.upsertSubscription(body);

    return {
      success: true as const,
      message: 'Billing subscription saved successfully.',
      data: subscription,
    };
  }

  @UseGuards(SessionAuthGuard, RolesGuard)
  @RequireRoles(...authRoles)
  @Get('subscription')
  public getStatus(@Query('workspaceKey') workspaceKey?: string) {
    return this.billingService.getBillingStatus(workspaceKey);
  }

  @UseGuards(SessionAuthGuard, RolesGuard)
  @RequireRoles('admin')
  @Post('portal-session')
  public async createPortalSession(
    @Body(new ZodValidationPipe(createBillingPortalSessionSchema))
    body: CreateBillingPortalSessionRequest,
  ) {
    const session = await this.billingService.createPortalSession(body);

    return {
      success: true as const,
      message: 'Billing portal session created successfully.',
      data: session,
    };
  }

  @PublicRoute()
  @Post('webhooks/stripe')
  public async handleStripeWebhook(
    @Body(new ZodValidationPipe(stripeWebhookEventSchema))
    body: StripeWebhookEventRequest,
  ) {
    const status = await this.billingService.handleWebhook(body);

    return {
      success: true as const,
      message: 'Stripe webhook processed successfully.',
      data: status,
    };
  }
}
