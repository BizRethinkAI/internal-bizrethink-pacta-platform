import { authenticatedProcedure } from '@documenso/trpc/server/trpc';
import { mcaPublicationStatus } from '../../../publish/server-only/publication-status';
import { publishMcaTemplate } from '../../../publish/server-only/publish-template';
import { ZMcaPublicationRequestSchema } from './router.types';

/**
 * Why this template may not be published — read, not enforced.
 *
 * A person deciding whether to publish should see what stands in the way before
 * pressing anything. A button that only tells you once you press it teaches
 * people to press it and read afterwards.
 */
export const mcaPublicationStatusRoute = authenticatedProcedure
  .input(ZMcaPublicationRequestSchema)
  .query(async ({ ctx, input }) => mcaPublicationStatus({ ...input, userId: ctx.user.id }));

/**
 * Publish, which today refuses.
 *
 * ADR 0023: the gate ships shut and stays shut until counsel approves clauses.
 * Write authority, the gate and everything after it are decided inside
 * `publishMcaTemplate`, so this route adds no rule of its own — a route that
 * carried its own copy of the rule is a second place for it to disagree.
 */
export const publishMcaTemplateRoute = authenticatedProcedure
  .input(ZMcaPublicationRequestSchema)
  .mutation(async ({ ctx, input }) =>
    publishMcaTemplate({ ...input, userId: ctx.user.id, requestMetadata: ctx.metadata }),
  );
