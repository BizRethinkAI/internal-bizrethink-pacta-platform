-- CreateTable
CREATE TABLE "BizrethinkInstanceStripeConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "billingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL DEFAULT 'sandbox',
    "sandboxApiKey" TEXT,
    "sandboxWebhookSecret" TEXT,
    "sandboxPublishableKey" TEXT,
    "liveApiKey" TEXT,
    "liveWebhookSecret" TEXT,
    "livePublishableKey" TEXT,
    "lastTestedSandbox" TIMESTAMP(3),
    "lastTestErrorSandbox" TEXT,
    "lastTestedLive" TIMESTAMP(3),
    "lastTestErrorLive" TEXT,
    "statementDescriptor" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" INTEGER,

    CONSTRAINT "BizrethinkInstanceStripeConfig_pkey" PRIMARY KEY ("id")
);
