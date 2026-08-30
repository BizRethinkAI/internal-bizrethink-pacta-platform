import { DOCUMENSO_ENCRYPTION_KEY } from '@documenso/lib/constants/crypto';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { symmetricDecrypt, symmetricEncrypt } from '@documenso/lib/universal/crypto';
import { prisma } from '@documenso/prisma';
import { bytesToUtf8 } from '@noble/ciphers/utils';

import type { AiProvider } from '../lease/ai/providers';
import { isAiProvider } from '../lease/ai/providers';

/*
  DB-backed AI credentials.

  Added 2026-05-01 as forward scaffolding for an upstream AI feature that never
  shipped, in a Vertex shape: project ID, location and API key. Simplified
  2026-08-30 when the clause drafter became its first consumer — the Gemini API
  and Anthropic both authenticate with a key alone, and the other two fields
  could never have been load-bearing alongside one.
*/

export type DecryptedAiConfig = {
  enabled: boolean;
  provider: AiProvider;
  apiKey: string | null;
};

let cachedConfig: DecryptedAiConfig | null = null;
let cachedNullProbed = false;
const setCachedConfig = (v: DecryptedAiConfig | null) => {
  cachedConfig = v;
};
const setCachedNullProbed = (v: boolean) => {
  cachedNullProbed = v;
};

const requireKey = () => {
  if (!DOCUMENSO_ENCRYPTION_KEY) {
    throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
      message: 'NEXT_PRIVATE_ENCRYPTION_KEY is not set; cannot encrypt/decrypt AI config',
    });
  }
  return DOCUMENSO_ENCRYPTION_KEY;
};

export const encryptAiString = (plain: string): string => symmetricEncrypt({ key: requireKey(), data: plain });

const decryptString = (cipher: string | null): string | null => {
  if (!cipher) {
    return null;
  }
  return bytesToUtf8(symmetricDecrypt({ key: requireKey(), data: cipher }));
};

export const getInstanceAiConfig = async (): Promise<DecryptedAiConfig | null> => {
  if (cachedConfig) {
    return cachedConfig;
  }
  if (cachedNullProbed) {
    return null;
  }

  const row = await prisma.bizrethinkInstanceAiConfig.findUnique({
    where: { id: 'singleton' },
  });

  if (!row) {
    setCachedNullProbed(true);
    return null;
  }

  const fresh: DecryptedAiConfig = {
    enabled: row.enabled,
    // Falls back rather than throwing: an unrecognised provider in the column
    // should degrade to the default, not take the page down.
    provider: isAiProvider(row.provider) ? row.provider : 'gemini',
    apiKey: decryptString(row.apiKey),
  };
  setCachedConfig(fresh);
  return fresh;
};

export const invalidateAiConfig = () => {
  setCachedConfig(null);
  setCachedNullProbed(false);
};

/**
 * Credentials, or null when the instance has none.
 *
 * Env fallback kept from the original design: a self-hosted instance may
 * prefer to inject a key rather than store one, and the DB row wins where both
 * exist. `BIZRETHINK_AI_API_KEY` replaces the three `GOOGLE_VERTEX_*` vars.
 */
export const getResolvedAiConfig = async (): Promise<{ provider: AiProvider; apiKey: string } | null> => {
  const db = await getInstanceAiConfig();

  if (db && !db.enabled) {
    return null;
  }

  const envProvider = process.env.BIZRETHINK_AI_PROVIDER;
  const provider: AiProvider = db?.provider ?? (isAiProvider(envProvider) ? envProvider : 'gemini');
  const apiKey = db?.apiKey || process.env.BIZRETHINK_AI_API_KEY || '';

  if (!apiKey) {
    return null;
  }

  return { provider, apiKey };
};
