import { lookup } from 'node:dns/promises';
import { z } from 'zod';

import { AppError, AppErrorCode } from '../../errors/app-error';
import { withTimeout } from '../../utils/timeout';
import { isPrivateUrl } from './is-private-url';

const ZIpSchema = z.string().ip();

const WEBHOOK_DNS_LOOKUP_TIMEOUT_MS = 250;

type TLookupAddress = {
  address: string;
  family: number;
};

type TLookupFn = (
  hostname: string,
  options: {
    all: true;
    verbatim: true;
  },
) => Promise<TLookupAddress[] | TLookupAddress>;

const normalizeHostname = (hostname: string) => hostname.toLowerCase().replace(/\.+$/, '');

const toAddressUrl = (address: string) => (address.includes(':') ? `http://[${address}]` : `http://${address}`);

// MODIFIED for BizRethink (overlay 017): bypass hosts come from the
// DB-backed site.webhook SiteSettings row merged with env. The async
// loader is dynamic-imported here to break a build-time circular dep.
//
// Empty or unset = no bypasses (safe default).
const isBypassedHost = async (url: string): Promise<boolean> => {
  const { getWebhookSsrfBypassHosts } = await import('@bizrethink/customizations/server-only/webhook-config');
  const bypass = await getWebhookSsrfBypassHosts();

  if (bypass.size === 0) {
    return false;
  }

  try {
    const hostname = normalizeHostname(new URL(url).hostname);
    return bypass.has(hostname);
  } catch {
    return false;
  }
};

/**
 * Assert that a webhook URL does not point at a private/loopback address,
 * checking both the literal host and its resolved DNS records. Throws an
 * AppError with WEBHOOK_INVALID_REQUEST if it does. Hosts listed in
 * NEXT_PRIVATE_WEBHOOK_SSRF_BYPASS_HOSTS skip all checks.
 *
 * This is best-effort, non-exhaustive SSRF defence, NOT a complete mitigation.
 * It does not cover DNS rebinding (the resolved address can change between this
 * check and the actual request), obscure IP encodings, or every IPv6 form, and
 * it fails open on lookup errors/timeouts (see the catch below). Network-level
 * SSRF protection (firewall/egress rules, blocking internal services and cloud
 * metadata endpoints) remains the responsibility of the deployment.
 */
export const assertNotPrivateUrl = async (
  url: string,
  options?: {
    lookup?: TLookupFn;
  },
) => {
  if (await isBypassedHost(url)) {
    return;
  }

  if (isPrivateUrl(url)) {
    throw new AppError(AppErrorCode.WEBHOOK_INVALID_REQUEST, {
      message: 'Webhook URL resolves to a private or loopback address',
    });
  }

  try {
    const hostname = normalizeHostname(new URL(url).hostname);

    if (hostname.length === 0 || ZIpSchema.safeParse(hostname).success) {
      return;
    }

    const resolveHostname = options?.lookup ?? lookup;

    const lookupResult = await withTimeout(
      resolveHostname(hostname, {
        all: true,
        verbatim: true,
      }),
      WEBHOOK_DNS_LOOKUP_TIMEOUT_MS,
    );

    if (!lookupResult) {
      return;
    }

    const addresses = Array.isArray(lookupResult) ? lookupResult : [lookupResult];

    if (addresses.some(({ address }) => isPrivateUrl(toAddressUrl(address)))) {
      throw new AppError(AppErrorCode.WEBHOOK_INVALID_REQUEST, {
        message: 'Webhook URL resolves to a private or loopback address',
      });
    }
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    return;
  }
};
