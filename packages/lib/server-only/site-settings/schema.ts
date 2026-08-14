// MODIFIED for BizRethink (overlay 012): extend the union with our additional
// site-setting IDs. Importing from `@bizrethink/customizations` keeps the
// schema declarations themselves out of upstream's tree.
import { ZSiteSettingsCaptchaSchema } from '@bizrethink/customizations/server-only/site-settings/schemas/captcha';
import { ZSiteSettingsSecurityHeadersSchema } from '@bizrethink/customizations/server-only/site-settings/schemas/security-headers';
import { ZSiteSettingsSignupSchema } from '@bizrethink/customizations/server-only/site-settings/schemas/signup';
import { ZSiteSettingsWebhookSchema } from '@bizrethink/customizations/server-only/site-settings/schemas/webhook';
import { z } from 'zod';

import { ZSiteSettingsBannerSchema } from './schemas/banner';
import { ZSiteSettingsEmailBlocklistSchema } from './schemas/email-blocklist';
import { ZSiteSettingsTelemetrySchema } from './schemas/telemetry';

export const ZSiteSettingSchema = z.union([
  ZSiteSettingsBannerSchema,
  ZSiteSettingsEmailBlocklistSchema,
  ZSiteSettingsTelemetrySchema,
  ZSiteSettingsSignupSchema,
  ZSiteSettingsCaptchaSchema,
  ZSiteSettingsWebhookSchema,
  ZSiteSettingsSecurityHeadersSchema,
]);

export type TSiteSettingSchema = z.infer<typeof ZSiteSettingSchema>;

export const ZSiteSettingsSchema = z.array(ZSiteSettingSchema);

export type TSiteSettingsSchema = z.infer<typeof ZSiteSettingsSchema>;
