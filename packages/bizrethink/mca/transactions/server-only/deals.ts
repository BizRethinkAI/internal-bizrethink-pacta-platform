import { randomUUID } from 'node:crypto';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';

import { assertMcaTeamAccess } from '../../templates/server-only/service';
import { compileMcaTemplate } from '../../templates/compile';
import { ZMcaProviderProfile } from '../../templates/profile';
import { fillMcaDraft } from '../fill';
import { type McaDraftInput, ZMcaDraftInput } from '../input';

type TeamActor = { teamId: number; userId: number };

/**
 * Deals in progress: the ANSWERS, never the assembled document.
 *
 * ADR 0022. The interview lost everything on reload, which made the builder
 * unusable for work that takes more than one sitting. What a saved deal must
 * never become is a store of legal text: reopening RECOMPILES from the template
 * revision the deal names, so a deal cannot carry stale wording forward and
 * there is no archived copy to be mistaken for an executed one.
 *
 * Writing a deal needs membership and the builder grant, but NOT team
 * ADMIN/MANAGER. Provider policy is the funder's programme and its managers'
 * to change; filling a deal is the ordinary work of whoever holds the grant.
 */
const scope = (id: string, team: { id: number; organisationId: string }) => ({
  id,
  teamId: team.id,
  organisationId: team.organisationId,
});

const gone = () => new AppError(AppErrorCode.NOT_FOUND, { message: 'No such MCA deal.' });

/** The saved revision, resolved under the caller's own team. */
const revisionFor = async (team: { id: number; organisationId: string }, templateId: string, version?: number) => {
  const template = await prisma.bizrethinkMcaTemplate.findFirst({
    where: { id: templateId, teamId: team.id, organisationId: team.organisationId },
    select: {
      id: true,
      currentRevision: true,
      revisions: version
        ? { where: { version }, select: { version: true, profile: true, fingerprint: true } }
        : { orderBy: { version: 'desc' }, take: 1, select: { version: true, profile: true, fingerprint: true } },
    },
  });
  const revision = template?.revisions[0];

  if (!template || !revision) {
    throw new AppError(AppErrorCode.NOT_FOUND, { message: 'No such MCA template revision.' });
  }

  return { templateId: template.id, revision };
};

export const saveMcaDeal = async ({
  teamId,
  userId,
  id,
  expectedVersion,
  templateId,
  label,
  input,
}: TeamActor & {
  id?: string;
  expectedVersion?: number;
  templateId: string;
  label: string;
  input: McaDraftInput;
}) => {
  const team = await assertMcaTeamAccess({ teamId, userId });
  const answers = ZMcaDraftInput.parse(input);

  if (!id) {
    const { revision } = await revisionFor(team, templateId);
    const created = await prisma.bizrethinkMcaDeal.create({
      data: {
        id: `mca_deal_${randomUUID().replace(/-/g, '')}`,
        organisationId: team.organisationId,
        teamId: team.id,
        templateId,
        templateRevision: revision.version,
        label,
        input: answers,
        createdByUserId: userId,
        updatedByUserId: userId,
      },
      select: { id: true, version: true, templateRevision: true },
    });

    return created;
  }

  if (!expectedVersion) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Saving an existing deal needs its version.' });
  }

  // Compare-and-swap: two people editing one deal is a conflict to report, not
  // a silent last write. These are contract figures.
  const updated = await prisma.bizrethinkMcaDeal.updateMany({
    where: { ...scope(id, team), version: expectedVersion },
    data: { label, input: answers, version: expectedVersion + 1, updatedByUserId: userId },
  });

  if (updated.count !== 1) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'This deal changed since it was opened. Reopen it and apply the change again.',
    });
  }

  // The stored revision is not touched: a save records answers, and moving a
  // deal onto a newer template revision is a different act with different
  // consequences for the wording it compiles to.
  return { id, version: expectedVersion + 1 };
};

export const openMcaDeal = async ({ teamId, userId, id }: TeamActor & { id: string }) => {
  const team = await assertMcaTeamAccess({ teamId, userId });
  const deal = await prisma.bizrethinkMcaDeal.findFirst({
    where: scope(id, team),
    select: {
      id: true,
      label: true,
      version: true,
      templateId: true,
      templateRevision: true,
      input: true,
      updatedAt: true,
    },
  });

  if (!deal) {
    throw gone();
  }

  const { revision } = await revisionFor(team, deal.templateId, deal.templateRevision);
  const snapshot = compileMcaTemplate(ZMcaProviderProfile.parse(revision.profile));
  const input = ZMcaDraftInput.parse(deal.input);

  return {
    id: deal.id,
    label: deal.label,
    version: deal.version,
    templateId: deal.templateId,
    templateRevision: deal.templateRevision,
    /** True when the saved revision still compiles to what it compiled to. */
    revisionCurrent: snapshot.fingerprint === revision.fingerprint,
    input,
    draft: fillMcaDraft(snapshot, input),
  };
};

/** Metadata only: a list never carries a merchant's answers. */
export const listMcaDeals = async ({ teamId, userId }: TeamActor) => {
  const team = await assertMcaTeamAccess({ teamId, userId });

  return prisma.bizrethinkMcaDeal.findMany({
    where: { teamId: team.id, organisationId: team.organisationId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      label: true,
      version: true,
      templateId: true,
      templateRevision: true,
      updatedAt: true,
      updatedByUserId: true,
    },
  });
};

/**
 * Deletion is real.
 *
 * A draft holds a merchant's details for a deal that may never happen; keeping
 * it forever is accumulation, not caution. There is no tombstone holding the
 * same data under a flag.
 */
export const deleteMcaDeal = async ({ teamId, userId, id }: TeamActor & { id: string }) => {
  const team = await assertMcaTeamAccess({ teamId, userId });
  const removed = await prisma.bizrethinkMcaDeal.deleteMany({ where: scope(id, team) });

  if (removed.count !== 1) {
    throw gone();
  }

  return { id };
};
