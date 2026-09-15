import { AppErrorCode } from '@documenso/lib/errors/app-error';
import { logger } from '@documenso/lib/utils/logger';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { matchesPermissionQuery, permissionContext } from '../../regression-tests/document-permission-fixture';
import { leaseBuilderRouter } from '../../server-only/trpc/lease-builder-router';
import { clauseFingerprint } from '../clauses/approval';
import { ALL_CLAUSES } from '../clauses/library';

const { db, canAccess } = vi.hoisted(() => ({
  db: {
    organisation: { findFirst: vi.fn() },
    bizrethinkLibraryFinding: { findMany: vi.fn(), updateMany: vi.fn() },
    bizrethinkClauseApproval: { updateMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
  canAccess: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('../../server-only/feature-access', () => ({ canAccessLeaseBuilder: canAccess }));
vi.mock('../server-only/create-envelope-from-matter', () => ({ createEnvelopeFromMatter: vi.fn() }));
vi.mock('../server-only/draft-clause', () => ({ draftClause: vi.fn() }));
vi.mock('../render/render-lease', () => ({ buildLeaseDocuments: vi.fn() }));

const clause = ALL_CLAUSES.find((candidate) => candidate.jurisdiction === 'US-FL')!;
const input = () => ({
  organisationId: 'org_a',
  clauseSlug: clause.slug,
  fingerprint: clauseFingerprint(clause),
  approvedByName: 'Synthetic reviewer',
  barJurisdiction: 'US-FL',
});
const caller = (admin = true, disabled = false) => {
  const context = permissionContext();
  context.user = { ...context.user!, roles: [admin ? Role.ADMIN : Role.USER], disabled };
  return leaseBuilderRouter.createCaller(context);
};
const foreignFinding = () => ({
  id: 'finding_b',
  clauseSlug: clause.slug,
  body: 'Synthetic unresolved defect',
  answeredAt: null as Date | null,
  answer: null as string | null,
  review: { organisationId: 'org_b' },
});
let findings: ReturnType<typeof foreignFinding>[];

beforeEach(() => {
  vi.resetAllMocks();
  logger.level = 'silent';
  findings = [];
  db.organisation.findFirst.mockResolvedValue({ id: 'org_a' });
  canAccess.mockResolvedValue(true);
  db.bizrethinkLibraryFinding.findMany.mockImplementation(async ({ where = {} }) =>
    findings.filter((finding) => matchesPermissionQuery(finding, where)),
  );
  db.bizrethinkLibraryFinding.updateMany.mockImplementation(async ({ where, data }) => {
    const selected = findings.filter((finding) => matchesPermissionQuery(finding, where));
    for (const finding of selected) {
      Object.assign(finding, data);
    }
    return { count: selected.length };
  });
  db.bizrethinkClauseApproval.updateMany.mockResolvedValue({ count: 1 });
  db.bizrethinkClauseApproval.create.mockResolvedValue({ id: 'approval_new' });
  db.$transaction.mockImplementation(async (operations) => Promise.all(operations));
});

describe('A-18 global lease approval authority', () => {
  it('rejects an ordinary user even with membership and an effective lease feature grant', async () => {
    await expect(caller(false).clauseLibrary.approve(input())).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(db.bizrethinkClauseApproval.create).not.toHaveBeenCalled();
    expect(db.bizrethinkClauseApproval.updateMany).not.toHaveBeenCalled();
    expect(db.bizrethinkLibraryFinding.findMany).not.toHaveBeenCalled();
  });

  it('rejects anonymous and disabled admin sessions before any approval write', async () => {
    const anonymous = permissionContext();
    anonymous.user = null;
    anonymous.session = null;
    await expect(leaseBuilderRouter.createCaller(anonymous).clauseLibrary.approve(input())).rejects.toThrow();
    await expect(caller(true, true).clauseLibrary.approve(input())).rejects.toThrow();
    expect(db.bizrethinkClauseApproval.create).not.toHaveBeenCalled();
  });

  it('blocks a global approval on an unresolved finding from another organisation', async () => {
    findings = [foreignFinding()];
    await expect(caller().clauseLibrary.approve(input())).rejects.toMatchObject({
      cause: { code: AppErrorCode.INVALID_REQUEST },
    });
    expect(db.bizrethinkClauseApproval.updateMany).not.toHaveBeenCalled();
    expect(db.bizrethinkClauseApproval.create).not.toHaveBeenCalled();
  });

  it('lets an admin see and answer the same global blockers, then record an attributed approval', async () => {
    findings = [foreignFinding()];
    expect(await caller().clauseLibrary.listFindings({ organisationId: 'org_a' })).toHaveLength(1);
    await expect(
      caller().clauseLibrary.answerFinding({ organisationId: 'org_a', findingId: 'finding_b', answer: 'Resolved.' }),
    ).resolves.toEqual({ answered: true });
    await expect(caller().clauseLibrary.approve(input())).resolves.toEqual({ approved: true });
    expect(db.bizrethinkClauseApproval.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ approvedByUserId: 7, fingerprint: input().fingerprint, clauseSlug: clause.slug }),
    });
  });

  it('does not expose or clear global findings for an ordinary granted user', async () => {
    findings = [foreignFinding()];
    await expect(caller(false).clauseLibrary.listFindings({ organisationId: 'org_a' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    await expect(
      caller(false).clauseLibrary.answerFinding({ organisationId: 'org_a', findingId: 'finding_b', answer: 'Done.' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(db.bizrethinkLibraryFinding.findMany).not.toHaveBeenCalled();
    expect(db.bizrethinkLibraryFinding.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    { fingerprint: 'old-wording' },
    { barJurisdiction: 'US-NC' },
  ])('retains the approval check for %j', async (overrides) => {
    await expect(caller().clauseLibrary.approve({ ...input(), ...overrides })).rejects.toMatchObject({
      cause: { code: AppErrorCode.INVALID_REQUEST },
    });
    expect(db.bizrethinkClauseApproval.create).not.toHaveBeenCalled();
  });
});
