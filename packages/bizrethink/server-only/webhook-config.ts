import { prisma } from '@documenso/prisma';

import { ZSiteSettingsWebhookSchema } from './site-settings/schemas/webhook';

// Phase I (overlay 017): DB-aware webhook SSRF bypass hosts loader.
//
// Returns the union of (DB-row hosts when enabled) ∪ (env-var hosts).
// Both sources contribute. The DB row is the operator-managed list; env
// is the bootstrap fallback for fresh instances. Hosts are lowercased.

const cache: { value: Set<string> | null; built: boolean } = {
  value: null,
  built: false,
};

const setCache = (v: Set<string> | null) => {
  cache.value = v;
  cache.built = v !== null;
};

const parseEnvHosts = (): Set<string> => {
  const raw = process.env.NEXT_PRIVATE_WEBHOOK_SSRF_BYPASS_HOSTS ?? '';
  const out = new Set<string>();
  for (const entry of raw.split(',')) {
    const trimmed = entry.trim().toLowerCase();
    if (trimmed.length > 0) {
      out.add(trimmed);
    }
  }
  return out;
};

export const getWebhookSsrfBypassHosts = async (): Promise<Set<string>> => {
  if (cache.built && cache.value) {
    return cache.value;
  }

  const merged = parseEnvHosts();

  // Defensive: if DB is unreachable (Postgres down, network flap, test env
  // without DB), fall back to env-only hosts. Better to validate webhook
  // URLs against the env list alone than to throw and break ALL webhook
  // delivery + the upstream `assertNotPrivateUrl` callers (which catch
  // AppError, not PrismaClientInitializationError).
  try {
    const row = await prisma.siteSettings.findFirst({
      where: { id: 'site.webhook' },
    });

    if (row && row.enabled) {
      const parsed = ZSiteSettingsWebhookSchema.safeParse(row);
      if (parsed.success) {
        for (const host of parsed.data.data.ssrfBypassHosts) {
          merged.add(host.trim().toLowerCase());
        }
      }
    }
  } catch (err) {
    console.warn(
      '[bizrethink/webhook-config] DB read failed; falling back to env-only SSRF bypass hosts:',
      err instanceof Error ? err.message : err,
    );
  }

  setCache(merged);
  return merged;
};

export const invalidateWebhookConfig = () => {
  setCache(null);
  cache.built = false;
};
