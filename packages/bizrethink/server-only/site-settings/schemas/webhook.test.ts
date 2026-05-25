import { describe, expect, it } from 'vitest';

import { SITE_SETTINGS_WEBHOOK_ID, ZSiteSettingsWebhookSchema } from './webhook';

const VALID_BASE = {
  id: SITE_SETTINGS_WEBHOOK_ID,
  enabled: true,
};

describe('ZSiteSettingsWebhookSchema', () => {
  it('parses a fully-populated valid row', () => {
    const parsed = ZSiteSettingsWebhookSchema.parse({
      ...VALID_BASE,
      data: {
        ssrfBypassHosts: ['internal-api.docker.local', 'circularpay-stripe-sandbox.test'],
      },
    });
    expect(parsed.data?.ssrfBypassHosts).toEqual([
      'internal-api.docker.local',
      'circularpay-stripe-sandbox.test',
    ]);
  });

  it('rejects wrong id literal', () => {
    const result = ZSiteSettingsWebhookSchema.safeParse({
      id: 'site.signup',
      enabled: true,
    });
    expect(result.success).toBe(false);
  });

  it('defaults data to empty ssrfBypassHosts when omitted', () => {
    const parsed = ZSiteSettingsWebhookSchema.parse(VALID_BASE);
    expect(parsed.data?.ssrfBypassHosts).toEqual([]);
  });

  it('rejects empty-string entries in ssrfBypassHosts', () => {
    const result = ZSiteSettingsWebhookSchema.safeParse({
      ...VALID_BASE,
      data: {
        ssrfBypassHosts: ['valid.host', ''],
      },
    });
    expect(result.success).toBe(false);
  });

  it('accepts an empty ssrfBypassHosts array', () => {
    const parsed = ZSiteSettingsWebhookSchema.parse({
      ...VALID_BASE,
      data: { ssrfBypassHosts: [] },
    });
    expect(parsed.data?.ssrfBypassHosts).toEqual([]);
  });

  it('requires ssrfBypassHosts to be an array if supplied', () => {
    const result = ZSiteSettingsWebhookSchema.safeParse({
      ...VALID_BASE,
      data: {
        ssrfBypassHosts: 'single.host',
      },
    });
    expect(result.success).toBe(false);
  });

  it('exports the canonical id constant', () => {
    expect(SITE_SETTINGS_WEBHOOK_ID).toBe('site.webhook');
  });
});
