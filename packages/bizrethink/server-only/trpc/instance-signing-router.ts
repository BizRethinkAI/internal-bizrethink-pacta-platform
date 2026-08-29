import { prisma } from '@documenso/prisma';
import { adminProcedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';

import { encryptBase64String, encryptUtf8String, invalidateSigningConfig } from '../instance-signing-config';

// Phase C (overlay 011 prerequisite): TRPC router for instance signing config.
//
// Procedures (all admin-only):
//   bizrethink.instanceSigning.get    — fetch the singleton row, redact secrets
//   bizrethink.instanceSigning.update — write the singleton; encrypt secrets;
//                                       bust the in-memory caches
//   bizrethink.instanceSigning.reset  — delete the singleton row, falling back
//                                       to env reads
//
// Authorization: every procedure requires an admin user (gate copied from
// upstream's admin-router pattern in `packages/trpc/server/admin-router`).
//
// File-upload pattern: the cert.p12 and gcloud-creds JSON are uploaded via
// the admin form as base64 strings (already base64-encoded client-side).
// Storing base64 on the wire keeps the schema simple — no multipart binary
// — and matches Documenso's existing `NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS`
// env var convention.

const ZTransport = z.enum(['local', 'gcloud-hsm']);

const ZUpdateInput = z.object({
  transport: ZTransport,

  // Local-cert fields. `localCertContentsBase64` is the new base64 if the
  // admin uploaded a fresh cert. Empty string means "keep existing". Same
  // semantics for passphrase.
  localCertContentsBase64: z.string(),
  localPassphrase: z.string(),

  // gcloud-hsm fields. Same "empty = keep existing" semantics for
  // credentials JSON + cert chain. `gcloudKeyPath` is plain text, replaced
  // wholesale (empty string clears it).
  gcloudKeyPath: z.string(),
  gcloudCredentialsJsonBase64: z.string(),
  gcloudCertChainPemBase64: z.string(),

  // CSV of TSA URLs. Empty string disables timestamping.
  tsaUrls: z.string(),

  // Plain text. Empty string clears it (signPdf falls back to webapp URL).
  signingContactInfo: z.string(),
});

const ZGetOutput = z
  .object({
    transport: ZTransport,
    hasLocalCert: z.boolean(),
    hasLocalPassphrase: z.boolean(),
    gcloudKeyPath: z.string().nullable(),
    hasGcloudCredentials: z.boolean(),
    hasGcloudCertChain: z.boolean(),
    tsaUrls: z.string().nullable(),
    signingContactInfo: z.string().nullable(),
    updatedAt: z.date(),
    updatedByUserId: z.number().nullable(),
  })
  .nullable();

const getRoute = adminProcedure.output(ZGetOutput).query(async () => {
  const row = await prisma.bizrethinkInstanceSigningConfig.findUnique({
    where: { id: 'singleton' },
  });

  if (!row) {
    return null;
  }

  return {
    transport: row.transport === 'gcloud-hsm' ? 'gcloud-hsm' : 'local',
    hasLocalCert: !!row.localCertContents,
    hasLocalPassphrase: !!row.localPassphrase,
    gcloudKeyPath: row.gcloudKeyPath,
    hasGcloudCredentials: !!row.gcloudCredentials,
    hasGcloudCertChain: !!row.gcloudCertChain,
    tsaUrls: row.tsaUrls,
    signingContactInfo: row.signingContactInfo,
    updatedAt: row.updatedAt,
    updatedByUserId: row.updatedByUserId,
  };
});

const updateRoute = adminProcedure
  .input(ZUpdateInput)
  .output(z.object({ ok: z.literal(true) }))
  .mutation(async ({ input, ctx }) => {
    const existing = await prisma.bizrethinkInstanceSigningConfig.findUnique({
      where: { id: 'singleton' },
    });

    // For each "secret" field, blank input means "keep existing"; non-blank
    // means "encrypt and replace". This mirrors the per-org SMTP password
    // pattern from Phase B.
    const localCertContents = input.localCertContentsBase64
      ? encryptBase64String(input.localCertContentsBase64)
      : (existing?.localCertContents ?? null);

    const localPassphrase = input.localPassphrase
      ? encryptUtf8String(input.localPassphrase)
      : (existing?.localPassphrase ?? null);

    const gcloudCredentials = input.gcloudCredentialsJsonBase64
      ? encryptBase64String(input.gcloudCredentialsJsonBase64)
      : (existing?.gcloudCredentials ?? null);

    const gcloudCertChain = input.gcloudCertChainPemBase64
      ? encryptBase64String(input.gcloudCertChainPemBase64)
      : (existing?.gcloudCertChain ?? null);

    await prisma.bizrethinkInstanceSigningConfig.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        transport: input.transport,
        localCertContents,
        localPassphrase,
        gcloudKeyPath: input.gcloudKeyPath || null,
        gcloudCredentials,
        gcloudCertChain,
        tsaUrls: input.tsaUrls || null,
        signingContactInfo: input.signingContactInfo || null,
        updatedByUserId: ctx.user.id,
      },
      update: {
        transport: input.transport,
        localCertContents,
        localPassphrase,
        gcloudKeyPath: input.gcloudKeyPath || null,
        gcloudCredentials,
        gcloudCertChain,
        tsaUrls: input.tsaUrls || null,
        signingContactInfo: input.signingContactInfo || null,
        updatedByUserId: ctx.user.id,
      },
    });

    invalidateSigningConfig();

    // Reset the signing transport caches in packages/signing/* so the next
    // signPdf picks up the new config without a process restart.
    const { resetSigningCaches } = await import('@documenso/signing');
    resetSigningCaches();

    return { ok: true as const };
  });

const resetRoute = adminProcedure.output(z.object({ ok: z.literal(true) })).mutation(async () => {
  await prisma.bizrethinkInstanceSigningConfig.deleteMany({
    where: { id: 'singleton' },
  });

  invalidateSigningConfig();

  const { resetSigningCaches } = await import('@documenso/signing');
  resetSigningCaches();

  return { ok: true as const };
});

export const instanceSigningRouter = router({
  get: getRoute,
  update: updateRoute,
  reset: resetRoute,
});
