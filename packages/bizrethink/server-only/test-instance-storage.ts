import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { alphaid } from '@documenso/lib/universal/id';

// Phase E (overlay 013 extension): test S3 storage credentials without saving.
//
// Used by the "Test connection" button on /admin/storage. Builds a throwaway
// S3Client from the form values, performs a PutObject → GetObject →
// DeleteObject roundtrip on a tiny test key (~50 bytes), and returns ok or
// the error message. Mirrors test-org-smtp.ts in shape and intent.
//
// The test is fail-safe: even if PutObject succeeds but GetObject or
// DeleteObject fails, the test reports failure — partial success usually
// indicates a permissions misconfiguration that would bite real uploads.

export type TestStorageConfig = {
  endpoint: string; // optional; empty string = use AWS default
  region: string;
  bucket: string;
  forcePathStyle: boolean;
  accessKeyId: string; // plaintext from form OR pre-decrypted from DB
  secretAccessKey: string;
};

export type TestStorageResult =
  | { ok: true; details: { bucket: string; endpoint: string; roundTripMs: number } }
  | { ok: false; error: string; stage: 'connect' | 'put' | 'get' | 'delete' };

export const testInstanceStorage = async (config: TestStorageConfig): Promise<TestStorageResult> => {
  if (!config.bucket) {
    return { ok: false, error: 'Bucket name is required', stage: 'connect' };
  }
  if (!config.accessKeyId || !config.secretAccessKey) {
    return {
      ok: false,
      error: 'Access Key ID and Secret Access Key are required',
      stage: 'connect',
    };
  }

  const startedAt = Date.now();

  const client = new S3Client({
    endpoint: config.endpoint || undefined,
    region: config.region || 'us-east-1',
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestHandler: {
      // Cap how long we wait for the storage backend to respond.
      requestTimeout: 10_000,
      connectionTimeout: 10_000,
    },
  });

  // Use a recognizable test-only key with a randomised suffix so concurrent
  // tests don't collide.
  const key = `_pacta_storage_test_${alphaid(8)}.txt`;
  const body = `Pacta storage test — ${new Date().toISOString()}`;

  // PUT
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: 'text/plain',
      }),
    );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error during PutObject',
      stage: 'put',
    };
  }

  // GET (verify what we wrote is what we read)
  try {
    const got = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
    const readBody = await got.Body?.transformToString('utf-8');
    if (readBody !== body) {
      return {
        ok: false,
        error: 'GetObject returned unexpected body — round-trip integrity check failed',
        stage: 'get',
      };
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error during GetObject',
      stage: 'get',
    };
  }

  // DELETE (cleanup)
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error during DeleteObject',
      stage: 'delete',
    };
  }

  return {
    ok: true,
    details: {
      bucket: config.bucket,
      endpoint: config.endpoint || 'AWS default',
      roundTripMs: Date.now() - startedAt,
    },
  };
};
