import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAllowedSignupDomains,
  getOidcProviderLabel,
  IDENTITY_PROVIDER_NAME,
  isEmailDomainAllowedForSignup,
  isGoogleSsoEnabled,
  isMicrosoftSsoEnabled,
  isOidcSsoEnabled,
  URL_PATTERN,
  ZNameSchema,
} from './auth';

// The 6 async getters dynamic-import the bizrethink helper. Mock the
// helper module so we control its return values.
const mockedGetProviderConfig = vi.fn();
const mockedAllowedDomains = vi.fn();

vi.mock('@bizrethink/customizations/server-only/sso-provider-config', () => ({
  getProviderConfig: (...args: unknown[]) => mockedGetProviderConfig(...args),
}));

vi.mock('@bizrethink/customizations/server-only/signup-config', () => ({
  getAllowedSignupDomains: (...args: unknown[]) => mockedAllowedDomains(...args),
}));

beforeEach(() => {
  mockedGetProviderConfig.mockReset();
  mockedAllowedDomains.mockReset();
});

describe('ZNameSchema', () => {
  it('accepts a normal name', () => {
    expect(ZNameSchema.parse('Jane Doe')).toBe('Jane Doe');
  });

  it('trims whitespace', () => {
    expect(ZNameSchema.parse('  Alice  ')).toBe('Alice');
  });

  it('rejects names shorter than 3 chars (post-trim)', () => {
    expect(ZNameSchema.safeParse('Al').success).toBe(false);
  });

  it('rejects names containing a URL (phishing guard)', () => {
    expect(ZNameSchema.safeParse('http://evil.com').success).toBe(false);
    expect(ZNameSchema.safeParse('www.evil.com').success).toBe(false);
    expect(ZNameSchema.safeParse('Check HTTPS://evil.com').success).toBe(false);
  });

  it('URL_PATTERN matches www. + http(s)://', () => {
    expect(URL_PATTERN.test('http://x')).toBe(true);
    expect(URL_PATTERN.test('HTTPS://X')).toBe(true);
    expect(URL_PATTERN.test('www.example.com')).toBe(true);
    expect(URL_PATTERN.test('example.com')).toBe(false);
  });
});

describe('IDENTITY_PROVIDER_NAME', () => {
  it('DOCUMENSO key is rebranded to Pacta (overlay 021)', () => {
    expect(IDENTITY_PROVIDER_NAME.DOCUMENSO).toBe('Pacta');
  });

  it('GOOGLE / MICROSOFT / OIDC keys retain canonical names', () => {
    expect(IDENTITY_PROVIDER_NAME.GOOGLE).toBe('Google');
    expect(IDENTITY_PROVIDER_NAME.MICROSOFT).toBe('Microsoft');
    expect(IDENTITY_PROVIDER_NAME.OIDC).toBe('OIDC');
  });
});

describe('isGoogleSsoEnabled — overlay 014', () => {
  it('returns true when DB-backed provider config says enabled', async () => {
    mockedGetProviderConfig.mockResolvedValueOnce({ enabled: true });
    expect(await isGoogleSsoEnabled()).toBe(true);
    expect(mockedGetProviderConfig).toHaveBeenCalledWith('google');
  });

  it('returns false when DB says disabled', async () => {
    mockedGetProviderConfig.mockResolvedValueOnce({ enabled: false });
    expect(await isGoogleSsoEnabled()).toBe(false);
  });
});

describe('isMicrosoftSsoEnabled — overlay 014', () => {
  it('returns true when DB says enabled', async () => {
    mockedGetProviderConfig.mockResolvedValueOnce({ enabled: true });
    expect(await isMicrosoftSsoEnabled()).toBe(true);
    expect(mockedGetProviderConfig).toHaveBeenCalledWith('microsoft');
  });
});

describe('isOidcSsoEnabled — overlay 014', () => {
  it('returns true when DB says enabled', async () => {
    mockedGetProviderConfig.mockResolvedValueOnce({ enabled: true });
    expect(await isOidcSsoEnabled()).toBe(true);
    expect(mockedGetProviderConfig).toHaveBeenCalledWith('oidc');
  });
});

describe('getOidcProviderLabel — overlay 014', () => {
  it('returns DB label when present', async () => {
    mockedGetProviderConfig.mockResolvedValueOnce({ oidcProviderLabel: 'Example IDP' });
    expect(await getOidcProviderLabel()).toBe('Example IDP');
  });

  it('falls back to "OIDC" when DB label is empty/falsy', async () => {
    mockedGetProviderConfig.mockResolvedValueOnce({ oidcProviderLabel: '' });
    expect(await getOidcProviderLabel()).toBe('OIDC');
  });

  it('falls back to "OIDC" when DB label is undefined', async () => {
    mockedGetProviderConfig.mockResolvedValueOnce({ oidcProviderLabel: undefined });
    expect(await getOidcProviderLabel()).toBe('OIDC');
  });
});

describe('getAllowedSignupDomains — overlay 012', () => {
  it('returns domains lowercased', async () => {
    mockedAllowedDomains.mockResolvedValueOnce(['Example.COM', 'foo.test']);
    expect(await getAllowedSignupDomains()).toEqual(['example.com', 'foo.test']);
  });

  it('returns empty array when DB returns empty', async () => {
    mockedAllowedDomains.mockResolvedValueOnce([]);
    expect(await getAllowedSignupDomains()).toEqual([]);
  });
});

describe('isEmailDomainAllowedForSignup — overlay 012', () => {
  it('returns true when no domain restriction is configured', async () => {
    mockedAllowedDomains.mockResolvedValueOnce([]);
    expect(await isEmailDomainAllowedForSignup('anyone@anywhere.com')).toBe(true);
  });

  it('returns true when email domain matches allowed list (case-insensitive)', async () => {
    mockedAllowedDomains.mockResolvedValueOnce(['example.com']);
    expect(await isEmailDomainAllowedForSignup('alice@EXAMPLE.COM')).toBe(true);
  });

  it('returns false when email domain not in allowlist', async () => {
    mockedAllowedDomains.mockResolvedValueOnce(['example.com']);
    expect(await isEmailDomainAllowedForSignup('alice@other.test')).toBe(false);
  });

  it('returns false when email has no @ part', async () => {
    mockedAllowedDomains.mockResolvedValueOnce(['example.com']);
    expect(await isEmailDomainAllowedForSignup('notanemail')).toBe(false);
  });
});
