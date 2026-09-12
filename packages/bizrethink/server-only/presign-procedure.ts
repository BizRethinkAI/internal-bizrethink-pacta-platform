import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { procedure } from '@documenso/trpc/server/trpc';

import { withApiTokenTeamScope } from './api-token-team-scope';
import { verifyPresignCapability } from './presign-capability';

/** Verify once, then retain the parent team's boundary through all nested mutations. */
export const presignProcedure = procedure.use(async ({ ctx, next }) => {
  const [token] = (ctx.req.headers.get('authorization') || '').split('Bearer ').filter(Boolean);
  if (!token) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, { message: 'No presign token provided' });
  }
  const capability = await verifyPresignCapability({ token });
  return await withApiTokenTeamScope(capability.teamId, () => next({ ctx: { ...ctx, presignCapability: capability } }));
});
