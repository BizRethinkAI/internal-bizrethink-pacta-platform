import { describe, expect, it } from 'vitest';

import {
  SITE_SETTINGS_SECURITY_HEADERS_ID,
  ZSiteSettingsSecurityHeadersSchema,
} from './security-headers';

const VALID_BASE = {
  id: SITE_SETTINGS_SECURITY_HEADERS_ID,
  enabled: true,
};

describe('ZSiteSettingsSecurityHeadersSchema', () => {
  it('parses a fully-populated valid row', () => {
    const parsed = ZSiteSettingsSecurityHeadersSchema.parse({
      ...VALID_BASE,
      data: {
        hsts: {
          enabled: true,
          maxAgeSeconds: 63072000,
          includeSubdomains: true,
          preload: true,
        },
        permissionsPolicy: {
          enabled: true,
          value: 'camera=()',
        },
      },
    });
    expect(parsed.data?.hsts.enabled).toBe(true);
    expect(parsed.data?.hsts.maxAgeSeconds).toBe(63072000);
    expect(parsed.data?.permissionsPolicy.value).toBe('camera=()');
  });

  it('rejects wrong id literal', () => {
    const result = ZSiteSettingsSecurityHeadersSchema.safeParse({
      id: 'site.banner',
      enabled: false,
    });
    expect(result.success).toBe(false);
  });

  it('applies conservative defaults when data omitted: HSTS disabled, Permissions-Policy on with denylist', () => {
    const parsed = ZSiteSettingsSecurityHeadersSchema.parse(VALID_BASE);
    expect(parsed.data?.hsts.enabled).toBe(false);
    expect(parsed.data?.hsts.maxAgeSeconds).toBe(31536000);
    expect(parsed.data?.hsts.includeSubdomains).toBe(false);
    expect(parsed.data?.hsts.preload).toBe(false);
    expect(parsed.data?.permissionsPolicy.enabled).toBe(true);
    expect(parsed.data?.permissionsPolicy.value).toBe(
      'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    );
  });

  it('applies HSTS field-level defaults when only enabled is supplied', () => {
    const parsed = ZSiteSettingsSecurityHeadersSchema.parse({
      ...VALID_BASE,
      data: {
        hsts: { enabled: true },
        permissionsPolicy: { enabled: true, value: 'foo=()' },
      },
    });
    expect(parsed.data?.hsts.enabled).toBe(true);
    expect(parsed.data?.hsts.maxAgeSeconds).toBe(31536000);
    expect(parsed.data?.hsts.includeSubdomains).toBe(false);
    expect(parsed.data?.hsts.preload).toBe(false);
  });

  it('rejects negative maxAgeSeconds', () => {
    const result = ZSiteSettingsSecurityHeadersSchema.safeParse({
      ...VALID_BASE,
      data: {
        hsts: { enabled: true, maxAgeSeconds: -1 },
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer maxAgeSeconds', () => {
    const result = ZSiteSettingsSecurityHeadersSchema.safeParse({
      ...VALID_BASE,
      data: {
        hsts: { enabled: true, maxAgeSeconds: 100.5 },
      },
    });
    expect(result.success).toBe(false);
  });

  it('exports the canonical id constant', () => {
    expect(SITE_SETTINGS_SECURITY_HEADERS_ID).toBe('site.security-headers');
  });
});
