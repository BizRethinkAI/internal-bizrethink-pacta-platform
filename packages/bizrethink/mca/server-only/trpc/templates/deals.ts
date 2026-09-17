import { authenticatedProcedure } from '@documenso/trpc/server/trpc';
import { deleteMcaDeal, listMcaDeals, openMcaDeal, saveMcaDeal } from '../../../transactions/server-only/deals';
import {
  ZDeleteMcaDealRequestSchema,
  ZListMcaTemplatesRequestSchema,
  ZOpenMcaDealRequestSchema,
  ZSaveMcaDealRequestSchema,
} from './router.types';

// Saving and opening are POST-only for the same reason filling is: a merchant's
// details must not become a query string, a history entry or a GET cache key.
export const saveMcaDealRoute = authenticatedProcedure
  .input(ZSaveMcaDealRequestSchema)
  .mutation(({ ctx, input }) => saveMcaDeal({ ...input, userId: ctx.user.id }));

export const openMcaDealRoute = authenticatedProcedure
  .input(ZOpenMcaDealRequestSchema)
  .mutation(({ ctx, input }) => openMcaDeal({ ...input, userId: ctx.user.id }));

export const listMcaDealsRoute = authenticatedProcedure
  .input(ZListMcaTemplatesRequestSchema)
  .query(({ ctx, input }) => listMcaDeals({ ...input, userId: ctx.user.id }));

export const deleteMcaDealRoute = authenticatedProcedure
  .input(ZDeleteMcaDealRequestSchema)
  .mutation(({ ctx, input }) => deleteMcaDeal({ ...input, userId: ctx.user.id }));
