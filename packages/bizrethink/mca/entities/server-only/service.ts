import { randomUUID } from 'node:crypto';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';

import { assertMcaTeamAccess } from '../../templates/server-only/service';
import { type McaEntity, type McaEntityInput, ZMcaEntity } from '../entity';

/**
 * Saving and reading the entity that issues a document.
 *
 * ADR 0026. An entity is **our side**: chosen when a template is created, and
 * copied into that template's revision rather than read live by it, because
 * revisions are immutable and editing an entity must not change what an
 * already-published document says.
 *
 * WRITING NEEDS TEAM ADMIN OR MANAGER. These terms decide which clauses every
 * document this entity issues contains, so changing one is a programme decision
 * — the same authority ADR 0016 required for provider policy, and for the same
 * reason. Reading needs only membership and the builder grant.
 */
type TeamActor = { teamId: number; userId: number };

const scope = (id: string, team: { id: number; organisationId: string }) => ({
  id,
  teamId: team.id,
  organisationId: team.organisationId,
});

const gone = () => new AppError(AppErrorCode.NOT_FOUND, { message: 'No such MCA entity.' });

export const createMcaEntity = async ({
  teamId,
  userId,
  entity,
}: TeamActor & { entity: McaEntityInput }): Promise<{ id: string; version: number }> => {
  const team = await assertMcaTeamAccess({ teamId, userId, write: true });

  // Validated BEFORE the write. A half-formed entity is one a document would be
  // assembled from, and the contradiction checks live in the schema.
  const parsed = ZMcaEntity.parse(entity);

  return prisma.bizrethinkMcaEntity.create({
    data: {
      id: `mcaent_${randomUUID().replace(/-/g, '')}`,
      organisationId: team.organisationId,
      teamId: team.id,
      label: parsed.label,
      identity: parsed.identity,
      policy: parsed.policy,
      createdByUserId: userId,
      updatedByUserId: userId,
    },
    select: { id: true, version: true },
  });
};

/**
 * An entity is EDITED, unlike a revision, which is why it carries a version
 * rather than a history.
 *
 * Two people editing one is a conflict to report, not a silent last write: the
 * terms here decide clause selection for every document the entity issues.
 * What must not happen — an edit reaching a document already published — is
 * prevented by copying the entity into the revision, not by refusing the edit.
 */
export const updateMcaEntity = async ({
  teamId,
  userId,
  id,
  expectedVersion,
  entity,
}: TeamActor & { id: string; expectedVersion: number; entity: McaEntityInput }): Promise<{
  id: string;
  version: number;
}> => {
  const team = await assertMcaTeamAccess({ teamId, userId, write: true });
  const parsed = ZMcaEntity.parse(entity);

  const updated = await prisma.bizrethinkMcaEntity.updateMany({
    where: { ...scope(id, team), version: expectedVersion },
    data: {
      label: parsed.label,
      identity: parsed.identity,
      policy: parsed.policy,
      version: expectedVersion + 1,
      updatedByUserId: userId,
    },
  });

  if (updated.count !== 1) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'This entity changed since it was opened. Reopen it and apply the change again.',
    });
  }

  return { id, version: expectedVersion + 1 };
};

export type SavedMcaEntity = McaEntity & { id: string; version: number; updatedAt: Date };

export const getMcaEntity = async ({ teamId, userId, id }: TeamActor & { id: string }): Promise<SavedMcaEntity> => {
  const team = await assertMcaTeamAccess({ teamId, userId });
  const row = await prisma.bizrethinkMcaEntity.findFirst({
    where: scope(id, team),
    select: { id: true, label: true, identity: true, policy: true, version: true, updatedAt: true },
  });

  if (!row) {
    throw gone();
  }

  /*
    PARSED ON THE WAY OUT, NOT CAST.

    A row written before a schema change, or edited outside this service, would
    otherwise flow into clause selection as though it were valid. Failing here
    is loud and early; casting would put an unreadable programme in front of a
    reviewer as though it were readable.
  */
  const parsed = ZMcaEntity.parse({ label: row.label, identity: row.identity, policy: row.policy });

  return { ...parsed, id: row.id, version: row.version, updatedAt: row.updatedAt };
};

/** Metadata only: a list is for choosing between entities, not for reading one. */
export const listMcaEntities = async ({ teamId, userId }: TeamActor) => {
  const team = await assertMcaTeamAccess({ teamId, userId });

  return prisma.bizrethinkMcaEntity.findMany({
    where: { teamId: team.id, organisationId: team.organisationId },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: { id: true, label: true, version: true, updatedAt: true },
  });
};
