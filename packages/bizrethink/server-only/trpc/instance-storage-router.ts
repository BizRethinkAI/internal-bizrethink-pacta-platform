import { prisma } from '@documenso/prisma';
import { adminProcedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';

import { encryptStorageString, getInstanceStorageConfig, invalidateStorageConfig } from '../instance-storage-config';
import { testInstanceStorage } from '../test-instance-storage';

// Phase E (overlay 013 prerequisite): TRPC router for instance storage config.
// Admin-only: get / update / reset.

const ZTransport = z.enum(['database', 's3']);

const ZUpdateInput = z.object({
  transport: ZTransport,
  s3Endpoint: z.string(),
  s3ForcePathStyle: z.boolean(),
  s3Region: z.string(),
  s3Bucket: z.string(),
  // Empty = keep existing.
  s3AccessKeyId: z.string(),
  s3SecretAccessKey: z.string(),
  // Optional distribution.
  s3DistributionDomain: z.string(),
  s3DistributionKeyId: z.string(),
  s3DistributionKeyPem: z.string(),
});

const ZGetOutput = z
  .object({
    transport: ZTransport,
    s3Endpoint: z.string().nullable(),
    s3ForcePathStyle: z.boolean(),
    s3Region: z.string().nullable(),
    s3Bucket: z.string().nullable(),
    hasS3Credentials: z.boolean(),
    s3DistributionDomain: z.string().nullable(),
    hasS3DistributionKey: z.boolean(),
    updatedAt: z.date(),
  })
  .nullable();

export const instanceStorageRouter = router({
  get: adminProcedure.output(ZGetOutput).query(async () => {
    const row = await prisma.bizrethinkInstanceStorageConfig.findUnique({
      where: { id: 'singleton' },
    });
    if (!row) {
      return null;
    }
    return {
      transport: row.transport === 's3' ? 's3' : 'database',
      s3Endpoint: row.s3Endpoint,
      s3ForcePathStyle: row.s3ForcePathStyle,
      s3Region: row.s3Region,
      s3Bucket: row.s3Bucket,
      hasS3Credentials: !!(row.s3AccessKeyId && row.s3SecretAccessKey),
      s3DistributionDomain: row.s3DistributionDomain,
      hasS3DistributionKey: !!row.s3DistributionKeyPem,
      updatedAt: row.updatedAt,
    };
  }),

  update: adminProcedure
    .input(ZUpdateInput)
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.bizrethinkInstanceStorageConfig.findUnique({
        where: { id: 'singleton' },
      });

      const enc = (val: string, prev: string | null) => (val ? encryptStorageString(val) : (prev ?? null));

      const data = {
        transport: input.transport,
        s3Endpoint: input.s3Endpoint || null,
        s3ForcePathStyle: input.s3ForcePathStyle,
        s3Region: input.s3Region || null,
        s3Bucket: input.s3Bucket || null,
        s3AccessKeyId: enc(input.s3AccessKeyId, existing?.s3AccessKeyId ?? null),
        s3SecretAccessKey: enc(input.s3SecretAccessKey, existing?.s3SecretAccessKey ?? null),
        s3DistributionDomain: input.s3DistributionDomain || null,
        s3DistributionKeyId: enc(input.s3DistributionKeyId, existing?.s3DistributionKeyId ?? null),
        s3DistributionKeyPem: enc(input.s3DistributionKeyPem, existing?.s3DistributionKeyPem ?? null),
        updatedByUserId: ctx.user.id,
      };

      await prisma.bizrethinkInstanceStorageConfig.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', ...data },
        update: data,
      });

      invalidateStorageConfig();

      return { ok: true as const };
    }),

  reset: adminProcedure.output(z.object({ ok: z.literal(true) })).mutation(async () => {
    await prisma.bizrethinkInstanceStorageConfig.deleteMany({
      where: { id: 'singleton' },
    });
    invalidateStorageConfig();
    return { ok: true as const };
  }),

  // Run a real S3 round-trip (PutObject → GetObject → DeleteObject) against
  // the credentials in the form. Form values for access key / secret may be
  // empty (admin wants to test the saved creds) — in that case we fall back
  // to the decrypted DB row.
  test: adminProcedure
    .input(ZUpdateInput)
    .output(
      z.discriminatedUnion('ok', [
        z.object({
          ok: z.literal(true),
          details: z.object({
            bucket: z.string(),
            endpoint: z.string(),
            roundTripMs: z.number(),
          }),
        }),
        z.object({
          ok: z.literal(false),
          error: z.string(),
          stage: z.enum(['connect', 'put', 'get', 'delete']),
        }),
      ]),
    )
    .mutation(async ({ input }) => {
      let accessKeyId = input.s3AccessKeyId;
      let secretAccessKey = input.s3SecretAccessKey;

      // If either credential is blank, fall back to the saved (decrypted) value.
      if (!accessKeyId || !secretAccessKey) {
        const saved = await getInstanceStorageConfig();
        if (saved) {
          if (!accessKeyId) {
            accessKeyId = saved.s3AccessKeyId ?? '';
          }
          if (!secretAccessKey) {
            secretAccessKey = saved.s3SecretAccessKey ?? '';
          }
        }
      }

      return await testInstanceStorage({
        endpoint: input.s3Endpoint,
        region: input.s3Region,
        bucket: input.s3Bucket,
        forcePathStyle: input.s3ForcePathStyle,
        accessKeyId,
        secretAccessKey,
      });
    }),
});
