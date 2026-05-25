import { describe, expect, it } from 'vitest';

import { SITE_SETTINGS_SIGNUP_ID, ZSiteSettingsSignupSchema } from './signup';

const VALID_BASE = {
  id: SITE_SETTINGS_SIGNUP_ID,
  enabled: true,
};

describe('ZSiteSettingsSignupSchema', () => {
  it('parses a fully-populated valid row', () => {
    const parsed = ZSiteSettingsSignupSchema.parse({
      ...VALID_BASE,
      data: {
        signupDisabled: false,
        allowedDomains: ['example.com', 'circularpayments.com'],
        requireInviteWhenDomainGated: true,
      },
    });
    expect(parsed.data?.signupDisabled).toBe(false);
    expect(parsed.data?.allowedDomains).toEqual(['example.com', 'circularpayments.com']);
    expect(parsed.data?.requireInviteWhenDomainGated).toBe(true);
  });

  it('rejects wrong id literal', () => {
    const result = ZSiteSettingsSignupSchema.safeParse({
      id: 'site.captcha',
      enabled: true,
    });
    expect(result.success).toBe(false);
  });

  it('applies safe defaults when data omitted (signup enabled, no domain gate, no invite gate)', () => {
    const parsed = ZSiteSettingsSignupSchema.parse(VALID_BASE);
    expect(parsed.data?.signupDisabled).toBe(false);
    expect(parsed.data?.allowedDomains).toEqual([]);
    expect(parsed.data?.requireInviteWhenDomainGated).toBe(false);
  });

  it('rejects empty-string entries in allowedDomains', () => {
    const result = ZSiteSettingsSignupSchema.safeParse({
      ...VALID_BASE,
      data: {
        signupDisabled: false,
        allowedDomains: ['example.com', ''],
        requireInviteWhenDomainGated: false,
      },
    });
    expect(result.success).toBe(false);
  });

  it('accepts an empty allowedDomains array', () => {
    const parsed = ZSiteSettingsSignupSchema.parse({
      ...VALID_BASE,
      data: {
        signupDisabled: false,
        allowedDomains: [],
        requireInviteWhenDomainGated: false,
      },
    });
    expect(parsed.data?.allowedDomains).toEqual([]);
  });

  it('requires allowedDomains to be an array if supplied', () => {
    const result = ZSiteSettingsSignupSchema.safeParse({
      ...VALID_BASE,
      data: {
        signupDisabled: false,
        allowedDomains: 'example.com',
        requireInviteWhenDomainGated: false,
      },
    });
    expect(result.success).toBe(false);
  });

  it('exports the canonical id constant', () => {
    expect(SITE_SETTINGS_SIGNUP_ID).toBe('site.signup');
  });
});
