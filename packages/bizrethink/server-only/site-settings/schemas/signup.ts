import { z } from 'zod';

import { ZSiteSettingsBaseSchema } from '@documenso/lib/server-only/site-settings/schemas/_base';

// Phase D (overlay 012): site.signup site-setting.
//
// Holds two settings that previously lived as env vars:
//   - signupDisabled: bool — was NEXT_PUBLIC_DISABLE_SIGNUP=true
//   - allowedDomains: string[] — was NEXT_PRIVATE_ALLOWED_SIGNUP_DOMAINS (CSV)
//
// Stored as a row in the upstream `SiteSettings` table with id="site.signup".
// Wired into the union schema via overlay 012's patch on
// `packages/lib/server-only/site-settings/schema.ts`.

export const SITE_SETTINGS_SIGNUP_ID = 'site.signup';

export const ZSiteSettingsSignupSchema = ZSiteSettingsBaseSchema.extend({
  id: z.literal(SITE_SETTINGS_SIGNUP_ID),
  data: z
    .object({
      signupDisabled: z.boolean().default(false),
      allowedDomains: z.array(z.string().min(1)).default([]),
      // Phase L (2026-05-11): when true AND allowedDomains is non-empty,
      // signups are additionally required to match a PENDING
      // OrganisationMemberInvite. Closes the "domain matches but nobody
      // invited me" leak — useful for B2B-team setups where every legitimate
      // signup should be triggered by an admin invite first.
      requireInviteWhenDomainGated: z.boolean().default(false),
    })
    .optional()
    .default({
      signupDisabled: false,
      allowedDomains: [],
      requireInviteWhenDomainGated: false,
    }),
});

export type TSiteSettingsSignupSchema = z.infer<typeof ZSiteSettingsSignupSchema>;
