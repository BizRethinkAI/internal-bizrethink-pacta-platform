import { ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP } from '@documenso/lib/constants/organisations';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { generateDatabaseId } from '@documenso/lib/universal/id';
import { buildOrganisationWhereQuery } from '@documenso/lib/utils/organisations';
import { prisma } from '@documenso/prisma';
import { authenticatedProcedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';
import { assertSmtpTestBudget } from '../outbound/smtp-test-limit';
import { encryptOrgSmtpPassword, invalidateOrgMailer } from '../per-org-mailer';
import { testOrgSmtp } from '../test-org-smtp';

// Phase B (overlay 010 prerequisite): TRPC router for per-org SMTP config.
//
// Procedures:
//   bizrethink.organisationSmtp.get    — fetch config for an org (password redacted)
//   bizrethink.organisationSmtp.upsert — create or update the row; encrypts password
//   bizrethink.organisationSmtp.delete — remove the row
//   bizrethink.organisationSmtp.test   — verify SMTP creds without persisting
//
// Authorization: every procedure requires MANAGE_ORGANISATION on the target
// org. A connection test also consumes per-user and per-organisation budgets.

const ZOrgIdInput = z.object({
  organisationId: z.string(),
});

const ZSmtpConfigShape = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().positive(),
  secure: z.boolean(),
  username: z.string().min(1, 'Username is required'),
  password: z.string(), // empty string means "keep existing" on upsert
  fromName: z.string().min(1, 'From name is required'),
  fromAddress: z.string().email('From address must be a valid email'),
});

const ZUpsertInput = ZOrgIdInput.merge(ZSmtpConfigShape);

const ZTestInput = ZOrgIdInput.extend({
  host: z.string().trim().min(1).max(253),
  port: z.number().int().positive().max(65535),
  secure: z.boolean(),
  username: z.string().min(1),
  password: z.string().min(1, 'Password required to test'),
});

const ZTestOutput = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

const ZGetOutput = z
  .object({
    organisationId: z.string(),
    transport: z.string(),
    host: z.string(),
    port: z.number(),
    secure: z.boolean(),
    username: z.string(),
    fromName: z.string(),
    fromAddress: z.string(),
    lastTestedAt: z.date().nullable(),
    lastTestError: z.string().nullable(),
    updatedAt: z.date(),
    // Password is intentionally absent — never returned to client.
  })
  .nullable();

const ensureOrgManageAccess = async (organisationId: string, userId: number) => {
  const organisation = await prisma.organisation.findFirst({
    where: buildOrganisationWhereQuery({
      organisationId,
      userId,
      roles: ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP.MANAGE_ORGANISATION,
    }),
  });

  if (!organisation) {
    throw new AppError(AppErrorCode.UNAUTHORIZED);
  }

  return organisation;
};

const getRoute = authenticatedProcedure
  .input(ZOrgIdInput)
  .output(ZGetOutput)
  .query(async ({ input, ctx }) => {
    await ensureOrgManageAccess(input.organisationId, ctx.user.id);

    const config = await prisma.bizrethinkOrganisationSmtpConfig.findUnique({
      where: {
        organisationId: input.organisationId,
      },
    });

    if (!config) {
      return null;
    }

    // Strip password before returning to client.
    return {
      organisationId: config.organisationId,
      transport: config.transport,
      host: config.host,
      port: config.port,
      secure: config.secure,
      username: config.username,
      fromName: config.fromName,
      fromAddress: config.fromAddress,
      lastTestedAt: config.lastTestedAt,
      lastTestError: config.lastTestError,
      updatedAt: config.updatedAt,
    };
  });

const upsertRoute = authenticatedProcedure
  .input(ZUpsertInput)
  .output(z.object({ ok: z.literal(true) }))
  .mutation(async ({ input, ctx }) => {
    await ensureOrgManageAccess(input.organisationId, ctx.user.id);

    // If the form sent an empty password, look up the existing row's password
    // and reuse it. This lets admins update the other fields without
    // re-entering the password (which the GET path never returns).
    let encryptedPassword: string;
    if (input.password === '') {
      const existing = await prisma.bizrethinkOrganisationSmtpConfig.findUnique({
        where: { organisationId: input.organisationId },
      });
      if (!existing) {
        throw new AppError(AppErrorCode.INVALID_BODY, {
          message: 'Password is required when creating a new SMTP config',
        });
      }
      encryptedPassword = existing.password;
    } else {
      encryptedPassword = encryptOrgSmtpPassword(input.password);
    }

    await prisma.bizrethinkOrganisationSmtpConfig.upsert({
      where: { organisationId: input.organisationId },
      create: {
        id: generateDatabaseId('org_smtp' as never),
        organisationId: input.organisationId,
        transport: 'smtp-auth',
        host: input.host,
        port: input.port,
        secure: input.secure,
        username: input.username,
        password: encryptedPassword,
        fromName: input.fromName,
        fromAddress: input.fromAddress,
      },
      update: {
        host: input.host,
        port: input.port,
        secure: input.secure,
        username: input.username,
        password: encryptedPassword,
        fromName: input.fromName,
        fromAddress: input.fromAddress,
      },
    });

    invalidateOrgMailer(input.organisationId);

    return { ok: true as const };
  });

const deleteRoute = authenticatedProcedure
  .input(ZOrgIdInput)
  .output(z.object({ ok: z.literal(true) }))
  .mutation(async ({ input, ctx }) => {
    await ensureOrgManageAccess(input.organisationId, ctx.user.id);

    await prisma.bizrethinkOrganisationSmtpConfig.deleteMany({
      where: { organisationId: input.organisationId },
    });

    invalidateOrgMailer(input.organisationId);

    return { ok: true as const };
  });

const testRoute = authenticatedProcedure
  .input(ZTestInput)
  .output(ZTestOutput)
  .mutation(async ({ input, ctx }) => {
    await ensureOrgManageAccess(input.organisationId, ctx.user.id);
    await assertSmtpTestBudget(ctx.user.id, input.organisationId);
    return await testOrgSmtp(input);
  });

export const orgSmtpRouter = router({
  get: getRoute,
  upsert: upsertRoute,
  delete: deleteRoute,
  test: testRoute,
});
