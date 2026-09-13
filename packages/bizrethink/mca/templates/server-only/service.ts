import { randomUUID } from 'node:crypto';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { buildTeamWhereQuery } from '@documenso/lib/utils/teams';
import { prisma } from '@documenso/prisma';
import { TeamMemberRole } from '@documenso/prisma/generated/types';

import { getFeatureAccess } from '../../../server-only/feature-access';
import { compileMcaTemplate } from '../compile';
import { type McaProviderProfile, ZMcaProviderProfile } from '../profile';

export const MCA_BUILDER_FEATURE = 'mca-builder';
export const MCA_DRAFT_FEATURE = 'mca-clause-draft-rendering';
type TeamActor = { teamId: number; userId: number };

/** A feature grant never substitutes for membership or permission to change provider policy. */
export const assertMcaTeamAccess = async ({ teamId, userId, write = false }: TeamActor & { write?: boolean }) => {
  const team = await prisma.team.findFirst({
    where: buildTeamWhereQuery({
      teamId,
      userId,
      roles: write ? [TeamMemberRole.ADMIN, TeamMemberRole.MANAGER] : undefined,
    }),
    select: { id: true, organisationId: true },
  });
  if (
    !team ||
    !(await getFeatureAccess({ feature: MCA_BUILDER_FEATURE, organisationId: team.organisationId, userId }))
  ) {
    throw new AppError(AppErrorCode.NOT_FOUND, { message: 'MCA templates are unavailable for this team.' });
  }
  return team;
};

const scope = (id: string, team: { id: number; organisationId: string }) => ({
  id,
  teamId: team.id,
  organisationId: team.organisationId,
});
const missing = () => new AppError(AppErrorCode.NOT_FOUND, { message: 'No such MCA template revision.' });

export const createMcaTemplate = async ({ teamId, userId, profile }: TeamActor & { profile: McaProviderProfile }) => {
  const team = await assertMcaTeamAccess({ teamId, userId, write: true });
  const snapshot = compileMcaTemplate(profile);
  return prisma.bizrethinkMcaTemplate.create({
    data: {
      id: `mcat_${randomUUID()}`,
      teamId: team.id,
      organisationId: team.organisationId,
      label: snapshot.profile.label,
      createdByUserId: userId,
      revisions: {
        create: {
          id: `mcar_${randomUUID()}`,
          version: 1,
          profile: snapshot.profile,
          snapshot,
          fingerprint: snapshot.fingerprint,
          createdByUserId: userId,
        },
      },
    },
    select: { id: true, currentRevision: true },
  });
};

export const reviseMcaTemplate = async ({
  teamId,
  userId,
  id,
  expectedVersion,
  profile,
}: TeamActor & { id: string; expectedVersion: number; profile: McaProviderProfile }) => {
  const team = await assertMcaTeamAccess({ teamId, userId, write: true });
  const snapshot = compileMcaTemplate(profile);
  const version = expectedVersion + 1;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.bizrethinkMcaTemplate.updateMany({
      where: { ...scope(id, team), currentRevision: expectedVersion },
      data: { label: snapshot.profile.label, currentRevision: version },
    });
    if (updated.count !== 1) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, {
        message: 'This template changed or is unavailable. Reload before saving a new revision.',
      });
    }
    await tx.bizrethinkMcaTemplateRevision.create({
      data: {
        id: `mcar_${randomUUID()}`,
        templateId: id,
        version,
        profile: snapshot.profile,
        snapshot,
        fingerprint: snapshot.fingerprint,
        createdByUserId: userId,
      },
    });
    return { id, currentRevision: version };
  });
};

export const getMcaTemplate = async ({ teamId, userId, id, version }: TeamActor & { id: string; version?: number }) => {
  const team = await assertMcaTeamAccess({ teamId, userId });
  const row = await prisma.bizrethinkMcaTemplate.findFirst({
    where: scope(id, team),
    select: {
      id: true,
      label: true,
      currentRevision: true,
      revisions: {
        where: version ? { version } : undefined,
        orderBy: { version: 'desc' },
        take: 1,
        // The archival snapshot contains legal text; profile retrieval must not return it.
        select: { version: true, profile: true, fingerprint: true },
      },
    },
  });
  const revision = row?.revisions[0];
  if (!row || !revision) {
    throw missing();
  }
  const profile = ZMcaProviderProfile.parse(revision.profile);
  const current = compileMcaTemplate(profile).fingerprint === revision.fingerprint;
  return {
    id: row.id,
    label: row.label,
    currentRevision: row.currentRevision,
    version: revision.version,
    profile,
    fingerprint: revision.fingerprint,
    current,
  };
};

/** Internal-only preview. Creating a recipe or a draft grant is never merchant-send permission. */
export const previewMcaTemplate = async (input: TeamActor & { id: string; version: number }) => {
  const team = await assertMcaTeamAccess(input);
  if (
    !(await getFeatureAccess({ feature: MCA_DRAFT_FEATURE, organisationId: team.organisationId, userId: input.userId }))
  ) {
    throw new AppError(AppErrorCode.FORBIDDEN, { message: 'Internal draft preview access is required.' });
  }
  const template = await getMcaTemplate(input);
  if (!template.current) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'The source content or requirements changed. Create a new revision before previewing.',
    });
  }
  return {
    ...compileMcaTemplate(template.profile),
    templateId: input.id,
    version: input.version,
    audience: 'internal-draft' as const,
  };
};

export const listMcaTemplates = async (input: TeamActor) => {
  const team = await assertMcaTeamAccess(input);
  return prisma.bizrethinkMcaTemplate.findMany({
    where: { teamId: team.id, organisationId: team.organisationId },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: { id: true, label: true, currentRevision: true, updatedAt: true },
  });
};
