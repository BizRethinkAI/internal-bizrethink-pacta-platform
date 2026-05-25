import { prisma } from '@documenso/prisma';

import { ZSiteSettingsCaptchaSchema } from './site-settings/schemas/captcha';

// Phase G (overlay 015): DB-aware captcha config getters.

const readDb = async () => {
  // Defensive: DB unreachable falls back to env-only (callers below handle null).
  let row;
  try {
    row = await prisma.siteSettings.findFirst({
      where: { id: 'site.captcha' },
    });
  } catch (err) {
    console.warn(
      '[bizrethink/captcha-config] DB read failed; falling back to env-only:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
  if (!row || !row.enabled) return null;
  const parsed = ZSiteSettingsCaptchaSchema.safeParse(row);
  if (!parsed.success) return null;
  return parsed.data.data;
};

/**
 * Returns the Turnstile siteKey to expose to the client. DB row takes
 * precedence; NEXT_PUBLIC_TURNSTILE_SITE_KEY is the env fallback.
 */
export const getTurnstileSiteKey = async (): Promise<string> => {
  const cfg = await readDb();
  if (cfg && cfg.siteKey) return cfg.siteKey;
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
};

/**
 * Returns the Turnstile secretKey for server-side siteverify calls. DB
 * row takes precedence; NEXT_PRIVATE_TURNSTILE_SECRET_KEY is the env fallback.
 */
export const getTurnstileSecretKey = async (): Promise<string> => {
  const cfg = await readDb();
  if (cfg && cfg.secretKey) return cfg.secretKey;
  return process.env.NEXT_PRIVATE_TURNSTILE_SECRET_KEY ?? '';
};
