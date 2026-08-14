import type { SubscriptionClaim } from '@prisma/client';
import { z } from 'zod';

/**
 * Rate limit window schema.
 *
 * Example: "5m", "1h", "1d"
 */
export const RATE_LIMIT_WINDOW_REGEX = /^\d+[smhd]$/;

const RATE_LIMIT_WINDOW_ERROR_MESSAGE = 'Use a duration with a unit, e.g. 5m, 1h, or 24h';
const RATE_LIMIT_DUPLICATE_WINDOW_ERROR_MESSAGE = 'Use a unique window for each rate limit';

export const ZRateLimitWindowSchema = z.string().trim().regex(RATE_LIMIT_WINDOW_REGEX, {
  message: RATE_LIMIT_WINDOW_ERROR_MESSAGE,
});

export const ZRateLimitArraySchema = z
  .array(
    z.object({
      window: ZRateLimitWindowSchema,
      max: z.number().int().positive(),
    }),
  )
  .superRefine((entries, ctx) => {
    const windows = new Set<string>();

    entries.forEach((entry, index) => {
      const window = entry.window.trim();

      if (windows.has(window)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: RATE_LIMIT_DUPLICATE_WINDOW_ERROR_MESSAGE,
          path: [index, 'window'],
        });
      }

      windows.add(window);
    });
  });

export type TRateLimitArray = z.infer<typeof ZRateLimitArraySchema>;

/**
 * README:
 * - If you update this you MUST update the `backport-subscription-claims` schema as well.
 */
export const ZClaimFlagsSchema = z.object({
  /**
   * Allows disabling of Documenso branding for:
   * - Certificates
   * - Emails
   * - Other?
   */
  allowCustomBranding: z.boolean().optional(),
  hidePoweredBy: z.boolean().optional(),

  unlimitedDocuments: z.boolean().optional(),

  emailDomains: z.boolean().optional(),

  embedAuthoring: z.boolean().optional(),
  embedAuthoringWhiteLabel: z.boolean().optional(),

  embedSigning: z.boolean().optional(),
  embedSigningWhiteLabel: z.boolean().optional(),

  cfr21: z.boolean().optional(),

  hipaa: z.boolean().optional(),

  authenticationPortal: z.boolean().optional(),

  allowLegacyEnvelopes: z.boolean().optional(),

  signingReminders: z.boolean().optional(),

  // BizRethink-added flag (overlay 043). Gates AI-assisted document creation,
  // smart field detection on uploaded PDFs, and chat-with-document for signers.
  // Pro tier and above set true; Free sets false/undefined. Feature implementation
  // ships in a later phase; the flag exists now so tier definitions are stable.
  aiEnabled: z.boolean().optional(),

  cscQesSigning: z.boolean().optional(),

  /**
   * Controls whether an organisation is prevented from sending emails.
   *
   * When this is enabled, ALL emails for the organisation are blocked.
   */
  disableEmails: z.boolean().optional(),
});

export type TClaimFlags = z.infer<typeof ZClaimFlagsSchema>;

// When adding keys, update internal documentation with this.
export const SUBSCRIPTION_CLAIM_FEATURE_FLAGS: Record<
  keyof TClaimFlags,
  {
    label: string;
    key: keyof TClaimFlags;
    isEnterprise?: boolean;
  }
> = {
  unlimitedDocuments: {
    key: 'unlimitedDocuments',
    label: 'Unlimited documents',
  },
  allowCustomBranding: {
    key: 'allowCustomBranding',
    label: 'Branding',
  },
  hidePoweredBy: {
    key: 'hidePoweredBy',
    label: 'Hide Pacta branding by',
  },
  emailDomains: {
    key: 'emailDomains',
    label: 'Email domains',
    isEnterprise: true,
  },
  embedAuthoring: {
    key: 'embedAuthoring',
    label: 'Embed authoring',
    isEnterprise: true,
  },
  embedSigning: {
    key: 'embedSigning',
    label: 'Embed signing',
  },
  embedAuthoringWhiteLabel: {
    key: 'embedAuthoringWhiteLabel',
    label: 'White label for embed authoring',
    isEnterprise: true,
  },
  embedSigningWhiteLabel: {
    key: 'embedSigningWhiteLabel',
    label: 'White label for embed signing',
  },
  cfr21: {
    key: 'cfr21',
    label: '21 CFR',
    isEnterprise: true,
  },
  hipaa: {
    key: 'hipaa',
    label: 'HIPAA',
    isEnterprise: true,
  },
  authenticationPortal: {
    key: 'authenticationPortal',
    label: 'Authentication portal',
    isEnterprise: true,
  },
  allowLegacyEnvelopes: {
    key: 'allowLegacyEnvelopes',
    label: 'Allow Legacy Envelopes',
  },
  signingReminders: {
    key: 'signingReminders',
    label: 'Signing reminders',
  },
  // BizRethink (overlay 043).
  aiEnabled: {
    key: 'aiEnabled',
    label: 'AI-assisted document creation',
  },
  cscQesSigning: {
    key: 'cscQesSigning',
    label: 'QES signing',
    isEnterprise: true,
  },
  disableEmails: {
    key: 'disableEmails',
    label: 'Disable emails',
  },
};

export enum INTERNAL_CLAIM_ID {
  FREE = 'free',
  INDIVIDUAL = 'individual',
  TEAM = 'team',
  EARLY_ADOPTER = 'earlyAdopter',
  PLATFORM = 'platform',
  ENTERPRISE = 'enterprise',
  BIZRETHINK = 'bizrethink',
  // BizRethink-added public SaaS tiers (overlay 043). Pro + Business are the
  // paid public tiers; Free and Enterprise reuse the existing upstream entries.
  PRO = 'pro',
  BUSINESS = 'business',
}

export type InternalClaim = Pick<SubscriptionClaim, 'id' | 'name'>;

export type InternalClaims = {
  [key in INTERNAL_CLAIM_ID]: InternalClaim;
};

export const internalClaims: InternalClaims = {
  /**
   * Free plan has no rates and quotas since this may break self-hosters.
   */
  [INTERNAL_CLAIM_ID.FREE]: {
    id: INTERNAL_CLAIM_ID.FREE,
    name: 'Free',
  },
  [INTERNAL_CLAIM_ID.INDIVIDUAL]: {
    id: INTERNAL_CLAIM_ID.INDIVIDUAL,
    name: 'Individual',
  },
  [INTERNAL_CLAIM_ID.TEAM]: {
    id: INTERNAL_CLAIM_ID.TEAM,
    name: 'Teams',
  },
  [INTERNAL_CLAIM_ID.PLATFORM]: {
    id: INTERNAL_CLAIM_ID.PLATFORM,
    name: 'Platform',
  },
  [INTERNAL_CLAIM_ID.ENTERPRISE]: {
    id: INTERNAL_CLAIM_ID.ENTERPRISE,
    name: 'Enterprise',
  },
  [INTERNAL_CLAIM_ID.EARLY_ADOPTER]: {
    id: INTERNAL_CLAIM_ID.EARLY_ADOPTER,
    name: 'Early Adopter',
  },
  // BizRethink public SaaS tier — Pro (overlay 043). $35/mo or $350/yr.
  // Targets small fintech / healthcare buyers wanting branded signing +
  // AI-assisted document creation. 100 docs/mo (hard cap, no unlimitedDocuments
  // flag). 5 members. Custom branding + custom email domain + AI.
  [INTERNAL_CLAIM_ID.PRO]: {
    id: INTERNAL_CLAIM_ID.PRO,
    name: 'Pro',
  },
  // BizRethink public SaaS tier — Business (overlay 043). $199/mo or $1990/yr.
  // Targets mid-size compliance-heavy buyers (fintech, healthcare, regulated B2B).
  // Unlimited docs, 10 members (overage billing handled separately), full
  // compliance flag set (CFR21 + HIPAA + embedded signing). Full AI.
  [INTERNAL_CLAIM_ID.BUSINESS]: {
    id: INTERNAL_CLAIM_ID.BUSINESS,
    name: 'Business',
  },
  // MODIFIED for BizRethink: internal tier used by every org-creation path in
  // our self-host build. Mirrors ENTERPRISE flags. HIPAA + allowLegacyEnvelopes
  // intentionally omitted (out of scope per CLAUDE.md). See overlays/001.
  [INTERNAL_CLAIM_ID.BIZRETHINK]: {
    id: INTERNAL_CLAIM_ID.BIZRETHINK,
    name: 'BizRethink',
  },
} as const;
