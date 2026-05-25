import { describe, expect, it } from 'vitest';

import { SITE_SETTINGS_CAPTCHA_ID, ZSiteSettingsCaptchaSchema } from './captcha';

describe('ZSiteSettingsCaptchaSchema', () => {
  it('parses a fully-populated valid row', () => {
    const parsed = ZSiteSettingsCaptchaSchema.parse({
      id: 'site.captcha',
      enabled: true,
      data: {
        siteKey: '0x4AAAAAAB123abc',
        secretKey: '0x4AAAAAAB456xyz',
      },
    });
    expect(parsed.id).toBe('site.captcha');
    expect(parsed.enabled).toBe(true);
    expect(parsed.data?.siteKey).toBe('0x4AAAAAAB123abc');
    expect(parsed.data?.secretKey).toBe('0x4AAAAAAB456xyz');
  });

  it('rejects a row with the wrong id literal', () => {
    const result = ZSiteSettingsCaptchaSchema.safeParse({
      id: 'site.banner',
      enabled: false,
      data: { siteKey: '', secretKey: '' },
    });
    expect(result.success).toBe(false);
  });

  it('requires enabled to be a boolean', () => {
    const result = ZSiteSettingsCaptchaSchema.safeParse({
      id: SITE_SETTINGS_CAPTCHA_ID,
      enabled: 'yes',
      data: { siteKey: '', secretKey: '' },
    });
    expect(result.success).toBe(false);
  });

  it('defaults data to {siteKey:"", secretKey:""} when omitted', () => {
    const parsed = ZSiteSettingsCaptchaSchema.parse({
      id: SITE_SETTINGS_CAPTCHA_ID,
      enabled: false,
    });
    expect(parsed.data).toEqual({ siteKey: '', secretKey: '' });
  });

  it('defaults individual data fields when partially supplied', () => {
    const parsed = ZSiteSettingsCaptchaSchema.parse({
      id: SITE_SETTINGS_CAPTCHA_ID,
      enabled: true,
      data: { siteKey: 'only-site-key' },
    });
    expect(parsed.data?.siteKey).toBe('only-site-key');
    expect(parsed.data?.secretKey).toBe('');
  });

  it('rejects when siteKey is not a string', () => {
    const result = ZSiteSettingsCaptchaSchema.safeParse({
      id: SITE_SETTINGS_CAPTCHA_ID,
      enabled: true,
      data: { siteKey: 12345, secretKey: '' },
    });
    expect(result.success).toBe(false);
  });

  it('exports the canonical id constant', () => {
    expect(SITE_SETTINGS_CAPTCHA_ID).toBe('site.captcha');
  });
});
