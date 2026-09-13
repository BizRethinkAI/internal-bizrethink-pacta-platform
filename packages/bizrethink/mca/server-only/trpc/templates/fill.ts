import { authenticatedProcedure } from '@documenso/trpc/server/trpc';
import { prepareMcaDraft } from '../../../transactions/server-only/prepare';
import { ZFillMcaDraftRequestSchema } from './router.types';

// POST-only: transaction details must not be query strings, history entries or GET cache keys.
export const fillMcaDraftRoute = authenticatedProcedure.input(ZFillMcaDraftRequestSchema).mutation(({ ctx, input }) => {
  return prepareMcaDraft({ ...input, userId: ctx.user.id });
});
