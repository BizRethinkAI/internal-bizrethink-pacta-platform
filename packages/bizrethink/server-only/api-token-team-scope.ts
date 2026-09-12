import { AsyncLocalStorage } from 'node:async_hooks';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

// A-02: this is the authenticated API credential's team, never a request header
// or the user's selected team. Keep one storage across Remix/Hono bundle copies;
// a module-local instance can silently lose the boundary between those copies.
// Store only the immutable numeric ID, not a mutable token or request object.
declare global {
  // eslint-disable-next-line no-var
  var __bizrethinkApiTokenTeamStorage: AsyncLocalStorage<number> | undefined;
}

const storage =
  globalThis.__bizrethinkApiTokenTeamStorage ??
  (globalThis.__bizrethinkApiTokenTeamStorage = new AsyncLocalStorage<number>());

/** Run the authenticated handler inside its credential's boundary, across awaits. */
export const withApiTokenTeamScope = <T>(teamId: number, handler: () => T): T => {
  const enclosingTeamId = storage.getStore();
  if (!Number.isSafeInteger(teamId) || teamId <= 0 || (enclosingTeamId !== undefined && enclosingTeamId !== teamId)) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, { message: 'Invalid API token team scope' });
  }

  // run(), not enterWith(): restores the caller's context on success or failure
  // and does not attach this credential to concurrent human/API requests.
  return storage.run(teamId, handler);
};

/** Add outside the ownership/team-email OR; it can only narrow existing access. */
export const getApiTokenEnvelopeScope = (requestedTeamId: number): { teamId?: number } => {
  const tokenTeamId = storage.getStore();
  if (tokenTeamId === undefined) {
    // Browser sessions and non-API jobs retain upstream ownership semantics.
    return {};
  }

  if (tokenTeamId !== requestedTeamId) {
    // Do not combine one team's visibility role with another team's credential.
    throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Envelope could not be found' });
  }

  return { teamId: tokenTeamId };
};
