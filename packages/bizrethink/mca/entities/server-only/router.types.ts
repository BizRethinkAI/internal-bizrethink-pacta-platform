import { z } from 'zod';

import { ZMcaEntity, ZMcaEntityPolicy } from '../entity';

/**
 * The wire shape for entity records. ADR 0026.
 *
 * `teamId` is supplied and `userId` is NOT: every procedure authorises against
 * the session's user, so accepting one here would let any caller act as anyone.
 * The team is different — it is a choice a member makes between teams they
 * belong to, and `assertMcaTeamAccess` resolves it against actual membership.
 *
 * `.strict()` throughout, for the reason the entity schema itself is strict: a
 * field silently ignored is a field a funder believes they set.
 */
export const ZListMcaEntitiesRequestSchema = z.object({ teamId: z.number().int().positive() }).strict();

export const ZGetMcaEntityRequestSchema = ZListMcaEntitiesRequestSchema.extend({
  id: z.string().min(1).max(80),
}).strict();

export const ZCreateMcaEntityRequestSchema = ZListMcaEntitiesRequestSchema.extend({
  entity: ZMcaEntity,
}).strict();

/**
 * An entity is EDITED, so an update names the version it was opened at.
 *
 * Required rather than defaulted: a missing version would make two people
 * editing one entity a silent last-write-wins, and these terms decide clause
 * selection for every document the entity issues.
 */
export const ZUpdateMcaEntityRequestSchema = ZListMcaEntitiesRequestSchema.extend({
  id: z.string().min(1).max(80),
  data: z
    .object({
      expectedVersion: z.number().int().positive(),
      entity: ZMcaEntity,
    })
    .strict(),
}).strict();

/**
 * What each answer would do, asked about a DRAFT rather than a saved record.
 *
 * Takes the policy alone: nothing in the derivation reads an identity, so the
 * interview refetches when an answer changes rather than when someone types an
 * address. It is a read of the clause library with no tenancy of its own, but
 * it still goes through the team gate — the library is not public, and the
 * shape of a funder's programme is not a thing to answer for strangers.
 */
export const ZMcaAnswerConsequencesRequestSchema = ZListMcaEntitiesRequestSchema.extend({
  policy: ZMcaEntityPolicy,
}).strict();
