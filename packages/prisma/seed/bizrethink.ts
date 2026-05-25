import { encryptUtf8String } from '@bizrethink/customizations/server-only/instance-signing-config';
import { encryptStorageString } from '@bizrethink/customizations/server-only/instance-storage-config';
import { encryptStripeCredential } from '@bizrethink/customizations/server-only/instance-stripe-config';
import { encryptSsoString } from '@bizrethink/customizations/server-only/sso-provider-config';
import { OrganisationMemberInviteStatus } from '@prisma/client';

import { prisma } from '..';

// BizRethink-specific seed helpers for Playwright E2E tests.
//
// All helpers are idempotent (upsert) so a test can run twice without
// duplicate-key errors. Encrypted fields use the same crypto pipeline
// as production (symmetricEncrypt with NEXT_PRIVATE_ENCRYPTION_KEY).
//
// See COVERAGE-PLAN-2026-05-25.md §6 T5.

// ---------- site-settings rows ----------

export const seedSiteSettingsSignup = async (
  opts: {
    enabled?: boolean;
    signupDisabled?: boolean;
    allowedDomains?: string[];
    requireInviteWhenDomainGated?: boolean;
  } = {},
) => {
  return prisma.siteSettings.upsert({
    where: { id: 'site.signup' },
    create: {
      id: 'site.signup',
      enabled: opts.enabled ?? true,
      data: {
        signupDisabled: opts.signupDisabled ?? false,
        allowedDomains: opts.allowedDomains ?? [],
        requireInviteWhenDomainGated: opts.requireInviteWhenDomainGated ?? false,
      },
    },
    update: {
      enabled: opts.enabled ?? true,
      data: {
        signupDisabled: opts.signupDisabled ?? false,
        allowedDomains: opts.allowedDomains ?? [],
        requireInviteWhenDomainGated: opts.requireInviteWhenDomainGated ?? false,
      },
    },
  });
};

export const seedSiteSettingsCaptcha = async (
  opts: { enabled?: boolean; siteKey?: string; secretKey?: string } = {},
) => {
  return prisma.siteSettings.upsert({
    where: { id: 'site.captcha' },
    create: {
      id: 'site.captcha',
      enabled: opts.enabled ?? false,
      data: {
        siteKey: opts.siteKey ?? '',
        secretKey: opts.secretKey ?? '',
      },
    },
    update: {
      enabled: opts.enabled ?? false,
      data: {
        siteKey: opts.siteKey ?? '',
        secretKey: opts.secretKey ?? '',
      },
    },
  });
};

export const seedSiteSettingsWebhook = async (
  opts: { enabled?: boolean; ssrfBypassHosts?: string[] } = {},
) => {
  return prisma.siteSettings.upsert({
    where: { id: 'site.webhook' },
    create: {
      id: 'site.webhook',
      enabled: opts.enabled ?? false,
      data: { ssrfBypassHosts: opts.ssrfBypassHosts ?? [] },
    },
    update: {
      enabled: opts.enabled ?? false,
      data: { ssrfBypassHosts: opts.ssrfBypassHosts ?? [] },
    },
  });
};

export const seedSiteSettingsSecurityHeaders = async (
  opts: {
    enabled?: boolean;
    hstsEnabled?: boolean;
    hstsMaxAgeSeconds?: number;
    permissionsPolicyValue?: string;
  } = {},
) => {
  return prisma.siteSettings.upsert({
    where: { id: 'site.security-headers' },
    create: {
      id: 'site.security-headers',
      enabled: opts.enabled ?? false,
      data: {
        hsts: {
          enabled: opts.hstsEnabled ?? false,
          maxAgeSeconds: opts.hstsMaxAgeSeconds ?? 31536000,
          includeSubdomains: false,
          preload: false,
        },
        permissionsPolicy: {
          enabled: true,
          value:
            opts.permissionsPolicyValue ??
            'camera=(), microphone=(), geolocation=(), interest-cohort=()',
        },
      },
    },
    update: {
      enabled: opts.enabled ?? false,
    },
  });
};

// ---------- instance-config singletons ----------

export const seedInstanceSigningConfig = async (opts: {
  transport?: 'local' | 'gcloud-hsm';
  localPassphrase?: string;
  // base64-encoded p12 cert; pass plaintext base64, gets encrypted before write
  localCertBase64?: string;
  tsaUrls?: string[];
  signingContactInfo?: string;
}) => {
  return prisma.bizrethinkInstanceSigningConfig.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      transport: opts.transport ?? 'local',
      localPassphrase: opts.localPassphrase ? encryptUtf8String(opts.localPassphrase) : null,
      localCertContents: opts.localCertBase64 ? encryptUtf8String(opts.localCertBase64) : null,
      tsaUrls: opts.tsaUrls?.join(',') ?? null,
      signingContactInfo: opts.signingContactInfo ?? null,
    },
    update: {
      transport: opts.transport ?? 'local',
      localPassphrase: opts.localPassphrase ? encryptUtf8String(opts.localPassphrase) : null,
      localCertContents: opts.localCertBase64 ? encryptUtf8String(opts.localCertBase64) : null,
      tsaUrls: opts.tsaUrls?.join(',') ?? null,
      signingContactInfo: opts.signingContactInfo ?? null,
    },
  });
};

export const seedInstanceStorageConfig = async (opts: {
  transport?: 'database' | 's3';
  s3Endpoint?: string;
  s3Region?: string;
  s3Bucket?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3ForcePathStyle?: boolean;
}) => {
  return prisma.bizrethinkInstanceStorageConfig.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      transport: opts.transport ?? 's3',
      s3Endpoint: opts.s3Endpoint ?? null,
      s3Region: opts.s3Region ?? null,
      s3Bucket: opts.s3Bucket ?? null,
      s3AccessKeyId: opts.s3AccessKeyId ? encryptStorageString(opts.s3AccessKeyId) : null,
      s3SecretAccessKey: opts.s3SecretAccessKey
        ? encryptStorageString(opts.s3SecretAccessKey)
        : null,
      s3ForcePathStyle: opts.s3ForcePathStyle ?? false,
    },
    update: {
      transport: opts.transport ?? 's3',
      s3Endpoint: opts.s3Endpoint ?? null,
      s3Region: opts.s3Region ?? null,
      s3Bucket: opts.s3Bucket ?? null,
      s3AccessKeyId: opts.s3AccessKeyId ? encryptStorageString(opts.s3AccessKeyId) : null,
      s3SecretAccessKey: opts.s3SecretAccessKey
        ? encryptStorageString(opts.s3SecretAccessKey)
        : null,
      s3ForcePathStyle: opts.s3ForcePathStyle ?? false,
    },
  });
};

export const seedInstanceStripeConfig = async (opts: {
  mode?: 'sandbox' | 'live';
  billingEnabled?: boolean;
  sandboxApiKey?: string;
  sandboxWebhookSecret?: string;
  liveApiKey?: string;
  liveWebhookSecret?: string;
  statementDescriptor?: string;
}) => {
  return prisma.bizrethinkInstanceStripeConfig.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      mode: opts.mode ?? 'sandbox',
      billingEnabled: opts.billingEnabled ?? true,
      sandboxApiKey: opts.sandboxApiKey ? encryptStripeCredential(opts.sandboxApiKey) : null,
      sandboxWebhookSecret: opts.sandboxWebhookSecret
        ? encryptStripeCredential(opts.sandboxWebhookSecret)
        : null,
      liveApiKey: opts.liveApiKey ? encryptStripeCredential(opts.liveApiKey) : null,
      liveWebhookSecret: opts.liveWebhookSecret
        ? encryptStripeCredential(opts.liveWebhookSecret)
        : null,
      statementDescriptor: opts.statementDescriptor ?? null,
    },
    update: {
      mode: opts.mode ?? 'sandbox',
      billingEnabled: opts.billingEnabled ?? true,
    },
  });
};

export const seedSsoProviderConfig = async (opts: {
  provider: 'google' | 'microsoft' | 'oidc';
  enabled?: boolean;
  clientId?: string;
  clientSecret?: string;
  oidcWellKnownUrl?: string;
  oidcProviderLabel?: string;
}) => {
  return prisma.bizrethinkSsoProvider.upsert({
    where: { provider: opts.provider },
    create: {
      provider: opts.provider,
      enabled: opts.enabled ?? true,
      clientId: opts.clientId ? encryptSsoString(opts.clientId) : null,
      clientSecret: opts.clientSecret ? encryptSsoString(opts.clientSecret) : null,
      oidcWellKnownUrl: opts.oidcWellKnownUrl ?? null,
      oidcProviderLabel: opts.oidcProviderLabel ?? null,
      oidcSkipVerify: false,
      oidcPrompt: null,
    },
    update: {
      enabled: opts.enabled ?? true,
      clientId: opts.clientId ? encryptSsoString(opts.clientId) : null,
      clientSecret: opts.clientSecret ? encryptSsoString(opts.clientSecret) : null,
      oidcWellKnownUrl: opts.oidcWellKnownUrl ?? null,
      oidcProviderLabel: opts.oidcProviderLabel ?? null,
    },
  });
};

// ---------- per-org / per-invite ----------

export const seedBizRethinkOrganisationBilling = async (opts: {
  organisationId: string;
  bizrethinkInternal?: boolean;
  trialStartedAt?: Date | null;
  trialEndsAt?: Date | null;
}) => {
  return prisma.bizrethinkOrganisationBilling.upsert({
    where: { organisationId: opts.organisationId },
    create: {
      organisationId: opts.organisationId,
      bizrethinkInternal: opts.bizrethinkInternal ?? false,
      trialStartedAt: opts.trialStartedAt ?? null,
      trialEndsAt: opts.trialEndsAt ?? null,
    },
    update: {
      bizrethinkInternal: opts.bizrethinkInternal ?? false,
      trialStartedAt: opts.trialStartedAt ?? null,
      trialEndsAt: opts.trialEndsAt ?? null,
    },
  });
};

export const seedPendingInvite = async (opts: {
  email: string;
  organisationId: string;
  organisationRole?: 'ADMIN' | 'MANAGER' | 'MEMBER';
  invitedByUserId: number;
}) => {
  return prisma.organisationMemberInvite.create({
    data: {
      email: opts.email.toLowerCase(),
      organisationId: opts.organisationId,
      organisationRole: opts.organisationRole ?? 'MEMBER',
      status: OrganisationMemberInviteStatus.PENDING,
      invitedByUserId: opts.invitedByUserId,
      // Some Documenso versions require a token/code field; safe to nanoid here.
    } as never,
  });
};

// ---------- cleanup helpers (for tests that need fresh state) ----------

export const resetAllBizRethinkSingletons = async () => {
  await Promise.all([
    prisma.bizrethinkInstanceSigningConfig.deleteMany({ where: { id: 'singleton' } }),
    prisma.bizrethinkInstanceStorageConfig.deleteMany({ where: { id: 'singleton' } }),
    prisma.bizrethinkInstanceStripeConfig.deleteMany({ where: { id: 'singleton' } }),
    prisma.bizrethinkInstanceAiConfig.deleteMany({ where: { id: 'singleton' } }),
    prisma.bizrethinkSsoProvider.deleteMany({}),
    prisma.siteSettings.deleteMany({
      where: {
        id: {
          in: ['site.signup', 'site.captcha', 'site.webhook', 'site.security-headers'],
        },
      },
    }),
  ]);
};
