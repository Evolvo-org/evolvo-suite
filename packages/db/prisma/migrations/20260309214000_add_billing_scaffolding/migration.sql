-- CreateEnum
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateTable
CREATE TABLE "StripeCustomer" (
    "id" TEXT NOT NULL,
    "workspaceKey" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "workspaceKey" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" "BillingSubscriptionStatus" NOT NULL,
    "planKey" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "adminBypassActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "workspaceKey" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeCustomer_workspaceKey_key" ON "StripeCustomer"("workspaceKey");
CREATE UNIQUE INDEX "StripeCustomer_stripeCustomerId_key" ON "StripeCustomer"("stripeCustomerId");
CREATE UNIQUE INDEX "Subscription_workspaceKey_key" ON "Subscription"("workspaceKey");
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
CREATE UNIQUE INDEX "BillingWebhookEvent_providerEventId_key" ON "BillingWebhookEvent"("providerEventId");
CREATE INDEX "BillingWebhookEvent_workspaceKey_receivedAt_idx" ON "BillingWebhookEvent"("workspaceKey", "receivedAt");
CREATE INDEX "BillingWebhookEvent_stripeCustomerId_receivedAt_idx" ON "BillingWebhookEvent"("stripeCustomerId", "receivedAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_stripeCustomerId_fkey" FOREIGN KEY ("stripeCustomerId") REFERENCES "StripeCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingWebhookEvent" ADD CONSTRAINT "BillingWebhookEvent_stripeCustomerId_fkey" FOREIGN KEY ("stripeCustomerId") REFERENCES "StripeCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
