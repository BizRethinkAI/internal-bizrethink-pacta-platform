// ADDED for BizRethink (overlay 013, re-homed 2026-08-13).
//
// Upstream's 2026-08 sync replaced the inline S3 implementation in
// `server-actions.ts` with a provider abstraction (`providers/*`). Overlay 013
// used to live in `server-actions.ts`; its DB-first settings resolution now
// lives here so `S3Provider` can consume it without forking upstream's
// architecture.
//
// Every storage setting is read from the `BizrethinkInstanceStorageConfig`
// singleton (managed in /admin/storage) first, falling back to the historical
// env vars when no DB row exists — which is what a fresh instance sees before
// an admin configures storage.
import { env } from '@documenso/lib/utils/env';

export type ResolvedStorageSettings = {
  bucket: string | undefined;
  endpoint: string | undefined;
  forcePathStyle: boolean;
  region: string;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  distributionDomain: string | undefined;
  distributionKeyId: string | undefined;
  distributionKeyPem: string | undefined;
};

export const resolveStorageSettings = async (): Promise<ResolvedStorageSettings> => {
  const { getInstanceStorageConfig } = await import('@bizrethink/customizations/server-only/instance-storage-config');

  const db = await getInstanceStorageConfig();

  return {
    bucket: db?.s3Bucket ?? env('NEXT_PRIVATE_UPLOAD_BUCKET'),
    endpoint: db?.s3Endpoint ?? env('NEXT_PRIVATE_UPLOAD_ENDPOINT') ?? undefined,
    forcePathStyle: db?.s3ForcePathStyle ?? env('NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE') === 'true',
    region: db?.s3Region ?? env('NEXT_PRIVATE_UPLOAD_REGION') ?? 'us-east-1',
    accessKeyId: db?.s3AccessKeyId ?? env('NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID'),
    secretAccessKey: db?.s3SecretAccessKey ?? env('NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY'),
    distributionDomain: db?.s3DistributionDomain ?? env('NEXT_PRIVATE_UPLOAD_DISTRIBUTION_DOMAIN'),
    distributionKeyId: db?.s3DistributionKeyId ?? env('NEXT_PRIVATE_UPLOAD_DISTRIBUTION_KEY_ID'),
    distributionKeyPem: db?.s3DistributionKeyPem ?? env('NEXT_PRIVATE_UPLOAD_DISTRIBUTION_KEY_CONTENTS'),
  };
};
