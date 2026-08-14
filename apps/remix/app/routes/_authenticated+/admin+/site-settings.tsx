import {
  SITE_SETTINGS_CAPTCHA_ID,
  type TSiteSettingsCaptchaSchema,
} from '@bizrethink/customizations/server-only/site-settings/schemas/captcha';
import {
  SITE_SETTINGS_SECURITY_HEADERS_ID,
  type TSiteSettingsSecurityHeadersSchema,
} from '@bizrethink/customizations/server-only/site-settings/schemas/security-headers';
import {
  SITE_SETTINGS_SIGNUP_ID,
  type TSiteSettingsSignupSchema,
} from '@bizrethink/customizations/server-only/site-settings/schemas/signup';
import {
  SITE_SETTINGS_WEBHOOK_ID,
  type TSiteSettingsWebhookSchema,
} from '@bizrethink/customizations/server-only/site-settings/schemas/webhook';
import { getSiteSettings } from '@documenso/lib/server-only/site-settings/get-site-settings';
import { SITE_SETTINGS_BANNER_ID } from '@documenso/lib/server-only/site-settings/schemas/banner';
import { SITE_SETTINGS_EMAIL_BLOCKLIST_ID } from '@documenso/lib/server-only/site-settings/schemas/email-blocklist';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';

import { AdminCaptchaSection } from '~/components/general/admin-captcha-section';
import { AdminEmailBlocklistSection } from '~/components/general/admin-email-blocklist-section';
import { AdminSecurityHeadersSection } from '~/components/general/admin-security-headers-section';
import { AdminSignupGatingSection } from '~/components/general/admin-signup-gating-section';
import { AdminSiteBannerSection } from '~/components/general/admin-site-banner-section';
import { AdminWebhookSection } from '~/components/general/admin-webhook-section';
import { SettingsHeader } from '~/components/general/settings-header';

import type { Route } from './+types/site-settings';

export async function loader() {
  const settings = await getSiteSettings();

  const banner = settings.find((setting) => setting.id === SITE_SETTINGS_BANNER_ID);
  const emailBlocklist = settings.find((setting) => setting.id === SITE_SETTINGS_EMAIL_BLOCKLIST_ID);

  // ADDED for BizRethink (overlays 012 / 015 / 017 / 032): the four fork-owned
  // admin sections read their settings from the same site-settings table.
  const signup = settings.find((setting) => setting.id === SITE_SETTINGS_SIGNUP_ID);
  const captcha = settings.find((setting) => setting.id === SITE_SETTINGS_CAPTCHA_ID);
  const webhook = settings.find((setting) => setting.id === SITE_SETTINGS_WEBHOOK_ID);
  const securityHeaders = settings.find((setting) => setting.id === SITE_SETTINGS_SECURITY_HEADERS_ID);

  return { banner, emailBlocklist, signup, captcha, webhook, securityHeaders };
}

export default function AdminSiteSettingsPage({ loaderData }: Route.ComponentProps) {
  const { banner, emailBlocklist, signup, captcha, webhook, securityHeaders } = loaderData;

  const { _ } = useLingui();

  return (
    <div>
      <SettingsHeader title={_(msg`Site Settings`)} subtitle={_(msg`Manage your site settings here`)} />

      <div className="mt-8 space-y-12">
        <AdminSiteBannerSection banner={banner} />

        <AdminEmailBlocklistSection emailBlocklist={emailBlocklist} />

        {/* BizRethink sections (overlays 012 / 015 / 017 / 032). */}
        <AdminSignupGatingSection signup={signup as TSiteSettingsSignupSchema | undefined} />

        <AdminCaptchaSection captcha={captcha as TSiteSettingsCaptchaSchema | undefined} />

        <AdminWebhookSection webhook={webhook as TSiteSettingsWebhookSchema | undefined} />

        <AdminSecurityHeadersSection
          securityHeaders={securityHeaders as TSiteSettingsSecurityHeadersSchema | undefined}
        />
      </div>
    </div>
  );
}
