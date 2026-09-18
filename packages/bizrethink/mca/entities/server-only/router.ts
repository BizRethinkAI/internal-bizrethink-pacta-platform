import { authenticatedProcedure, router } from '@documenso/trpc/server/trpc';
import { assertMcaTeamAccess } from '../../templates/server-only/service';
import { answerConsequences, documentsThisEntityCanHave } from '../consequences';
import {
  ZCreateMcaEntityRequestSchema,
  ZGetMcaEntityRequestSchema,
  ZListMcaEntitiesRequestSchema,
  ZMcaAnswerConsequencesRequestSchema,
  ZUpdateMcaEntityRequestSchema,
} from './router.types';
import { createMcaEntity, getMcaEntity, listMcaEntities, updateMcaEntity } from './service';

/**
 * Reaching the entity record. ADR 0026.
 *
 * #310 shipped the record and the service and wired neither to anything, so an
 * entity could not be created at all. These are the four procedures that let a
 * person keep one — the same four the lease builder gives a property, and for
 * the same reason: an entity is a thing you add once and then choose, not a
 * form you refill per document.
 *
 * EVERY PROCEDURE PASSES `ctx.user.id`. The service authorises against it, and
 * writing needs ADMIN or MANAGER (ADR 0016): these terms decide which clauses
 * every document this entity issues contains, so changing one is a programme
 * decision rather than an edit.
 */
export const mcaEntitiesRouter = router({
  list: authenticatedProcedure.input(ZListMcaEntitiesRequestSchema).query(async ({ ctx, input }) => {
    return listMcaEntities({ ...input, userId: ctx.user.id });
  }),

  get: authenticatedProcedure.input(ZGetMcaEntityRequestSchema).query(async ({ ctx, input }) => {
    return getMcaEntity({ ...input, userId: ctx.user.id });
  }),

  create: authenticatedProcedure.input(ZCreateMcaEntityRequestSchema).mutation(async ({ ctx, input }) => {
    return createMcaEntity({ teamId: input.teamId, entity: input.entity, userId: ctx.user.id });
  }),

  /**
   * What each answer would do to the documents, derived from the same selection
   * the compiler runs — never a written description, which would drift from the
   * document the first time a clause's predicate moved.
   *
   * Server-side because the clause library is several hundred clauses and has
   * no business in a browser bundle.
   */
  consequences: authenticatedProcedure.input(ZMcaAnswerConsequencesRequestSchema).query(async ({ ctx, input }) => {
    await assertMcaTeamAccess({ teamId: input.teamId, userId: ctx.user.id });

    return {
      answers: answerConsequences(input.policy),
      documents: documentsThisEntityCanHave(input.policy),
    };
  }),

  update: authenticatedProcedure.input(ZUpdateMcaEntityRequestSchema).mutation(async ({ ctx, input }) => {
    return updateMcaEntity({
      teamId: input.teamId,
      id: input.id,
      expectedVersion: input.data.expectedVersion,
      entity: input.data.entity,
      userId: ctx.user.id,
    });
  }),
});
