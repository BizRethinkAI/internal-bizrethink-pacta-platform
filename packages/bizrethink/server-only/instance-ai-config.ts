import { DOCUMENSO_ENCRYPTION_KEY } from '@documenso/lib/constants/crypto';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { symmetricDecrypt, symmetricEncrypt } from '@documenso/lib/universal/crypto';
import { prisma } from '@documenso/prisma';
import { bytesToUtf8 } from '@noble/ciphers/utils';

// Phase H (overlay 016): DB-backed Vertex AI config.

export type DecryptedAiConfig = {
  enabled: boolean;
  vertexProjectId: string | null;
  vertexLocation: string | null;
  vertexApiKey: string | null;
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
    vertexProjectId: row.vertexProjectId,
    vertexLocation: row.vertexLocation,
    vertexApiKey: decryptString(row.vertexApiKey),
  };
  setCachedConfig(fresh);
  return fresh;
};

export const invalidateAiConfig = () => {
  setCachedConfig(null);
  setCachedNullProbed(false);
};

/**
 * Resolved Vertex config: DB row first, env fallback.
 * Returns null when neither source has credentials configured.
 */
export const getResolvedVertexConfig = async (): Promise<{
  projectId: string;
  location: string;
  apiKey: string;
} | null> => {
  const db = await getInstanceAiConfig();
  const projectId = db?.vertexProjectId || process.env.GOOGLE_VERTEX_PROJECT_ID || '';
  const location = db?.vertexLocation || process.env.GOOGLE_VERTEX_LOCATION || '';
  const apiKey = db?.vertexApiKey || process.env.GOOGLE_VERTEX_API_KEY || '';

  if (!projectId || !apiKey) {
    return null;
  }
  return { projectId, location, apiKey };
};
