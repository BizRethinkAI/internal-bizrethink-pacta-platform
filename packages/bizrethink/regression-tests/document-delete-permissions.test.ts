import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { logger } from '@documenso/lib/utils/logger';
import { deleteDocumentRoute } from '@documenso/trpc/server/document-router/delete-document';
import { deleteEnvelopeRoute } from '@documenso/trpc/server/envelope-router/delete-envelope';
import { router } from '@documenso/trpc/server/trpc';
import { DocumentVisibility, EnvelopeType, TeamMemberRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { envelopeFixture, recipientFixture } from './api-token-team-fixture';
import {
  matchesPermissionQuery,
  permissionContext,
  permissionTeam,
  permissionUser,
} from './document-permission-fixture';

const { db, getTeam, webhook } = vi.hoisted(() => ({
  db: {
    envelope: { findFirst: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), delete: vi.fn() },
    user: { findUnique: vi.fn() },
    recipient: { update: vi.fn() },
    documentAuditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  getTeam: vi.fn(),
  webhook: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/server-only/team/get-team', () => ({ getTeamById: getTeam }));
vi.mock('@documenso/lib/server-only/webhooks/trigger/trigger-webhook', () => ({ triggerWebhook: webhook }));
vi.mock('@documenso/lib/server-only/email/get-email-context', () => ({
  getEmailContext: vi.fn().mockResolvedValue({ emailLanguage: 'en', emailsDisabled: true }),
}));
vi.mock('@documenso/lib/jobs/client', () => ({ jobs: { triggerJob: vi.fn() } }));
const api = router({ legacy: deleteDocumentRoute, envelope: deleteEnvelopeRoute });
let envelope: ReturnType<typeof envelopeFixture> | null;
let role: TeamMemberRole;
beforeEach(() => {
  vi.clearAllMocks();
  logger.level = 'silent';
  role = TeamMemberRole.MEMBER;
  envelope = envelopeFixture({ userId: 8, visibility: DocumentVisibility.ADMIN });
  getTeam.mockImplementation(async ({ teamId }: { teamId: number }) => {
    if (teamId !== 10) {
      throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Team not found' });
    }
    return permissionTeam(teamId, role);
  });
  const find = async ({ where }: { where: Record<string, unknown> }) =>
    envelope && matchesPermissionQuery(envelope, where) ? envelope : null;
  db.envelope.findFirst.mockImplementation(find);
  db.envelope.findUnique.mockImplementation(find);
  db.envelope.findUniqueOrThrow.mockImplementation(async (args: Parameters<typeof find>[0]) => {
    const result = await find(args);
    if (!result) {
      throw new Error('Synthetic missing record');
    }
    return result;
  });
  db.user.findUnique.mockResolvedValue(permissionUser);
  db.recipient.update.mockResolvedValue({});
  db.envelope.delete.mockImplementation(async () => envelope);
  db.$transaction.mockImplementation(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db));
});
const calls = {
  legacy: () => api.createCaller(permissionContext()).legacy({ documentId: 1 }),
  envelope: () => api.createCaller(permissionContext()).envelope({ envelopeId: 'envelope_team_a' }),
};
const rejection = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error) {
    if (error instanceof TRPCError && error.cause instanceof AppError) {
      return { code: error.cause.code, message: error.cause.message };
    }
    throw error;
  }
  throw new Error('Expected a permission rejection');
};
describe('A-23 document deletion reveals no foreign/hidden existence', () => {
  it('does not use a template recipient as document self-hide authority', async () => {
    if (!envelope) {
      throw new Error('Fixture missing');
    }
    envelope.type = EnvelopeType.TEMPLATE;
    envelope.secondaryId = 'template_1';
    envelope.recipients = [{ ...recipientFixture(envelope.id), email: permissionUser.email }];
    const foreign = await rejection(calls.envelope);
    envelope = null;
    expect(foreign).toEqual(await rejection(calls.envelope));
    expect(foreign.code).toBe(AppErrorCode.NOT_FOUND);
    expect(db.envelope.delete).not.toHaveBeenCalled();
    expect(db.recipient.update).not.toHaveBeenCalled();
  });
  for (const [name, run] of Object.entries(calls)) {
    it(`uses identical absence errors for hidden, foreign and missing documents (${name})`, async () => {
      const hidden = await rejection(run);
      if (!envelope) {
        throw new Error('Fixture missing');
      }
      envelope.teamId = 20;
      const foreign = await rejection(run);
      envelope = null;
      const absent = await rejection(run);
      expect(hidden.code).toBe(AppErrorCode.NOT_FOUND);
      expect(hidden).toEqual(absent);
      expect(foreign).toEqual(absent);
      expect(db.envelope.delete).not.toHaveBeenCalled();
      expect(db.recipient.update).not.toHaveBeenCalled();
      expect(db.documentAuditLog.create).not.toHaveBeenCalled();
      expect(webhook).not.toHaveBeenCalled();
    });
    it(`preserves a recipient hiding their own received copy (${name})`, async () => {
      if (!envelope) {
        throw new Error('Fixture missing');
      }
      envelope.teamId = 20;
      envelope.recipients = [{ ...recipientFixture(envelope.id), email: permissionUser.email }];
      await expect(run()).resolves.toEqual({ success: true });
      expect(db.recipient.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
      expect(db.envelope.delete).not.toHaveBeenCalled();
      expect(webhook).not.toHaveBeenCalled();
    });
    it(`preserves permitted owner deletion (${name})`, async () => {
      if (!envelope) {
        throw new Error('Fixture missing');
      }
      envelope.userId = permissionUser.id;
      await expect(run()).resolves.toEqual({ success: true });
      expect(db.envelope.delete).toHaveBeenCalledOnce();
      expect(db.documentAuditLog.create).toHaveBeenCalledOnce();
      expect(webhook).toHaveBeenCalledOnce();
    });
  }
});
