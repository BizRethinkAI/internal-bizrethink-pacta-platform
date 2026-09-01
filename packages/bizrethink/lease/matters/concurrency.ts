/**
 * Refusing a save that was built on a stale read.
 *
 * The interview seeds every answer into React state once, at mount, and then
 * writes the whole set back on each step change. Nothing resynced that state,
 * and two writers share the column: `applyTenantAnswers` writes the tenant's
 * returned answers into `values` on the same matter.
 *
 * So a landlord with the interview open when the tenant returns their review
 * link destroyed the tenant's answers on their next click of Next — silently,
 * unrecoverably, and in direct contradiction of the delegation control's own
 * promise that "you see what they wrote before anything is sent".
 *
 * RESYNCING THE STATE WOULD BE THE WRONG FIX: it would throw away whatever the
 * landlord had typed since the page loaded, trading one silent loss for
 * another. The only honest answer is to notice and refuse, and to say what
 * happened — a lost update should never be resolved by guessing which writer
 * mattered.
 */

export type FreshnessCheck = {
  /** What the client had when it built this write. */
  expected: Date | string | null | undefined;
  /** What the row says now. */
  actual: Date | string;
};

const toMillis = (value: Date | string): number =>
  value instanceof Date ? value.getTime() : new Date(value).getTime();

/**
 * A message when the write must be refused, `null` when it may proceed.
 *
 * An ABSENT `expected` is allowed through. Older clients exist, and turning
 * every one of their saves into an error would replace a rare lost update with
 * a constant one. Callers that care pass it.
 */
export const staleWriteMessage = ({ expected, actual }: FreshnessCheck): string | null => {
  if (expected === null || expected === undefined || expected === '') {
    return null;
  }

  const had = toMillis(expected);
  const now = toMillis(actual);

  if (Number.isNaN(had) || Number.isNaN(now) || had === now) {
    return null;
  }

  /*
    Deliberately not "your changes were rejected". The landlord's changes are
    still in the page in front of them; what is refused is overwriting someone
    else's. Reloading is the recovery, and it costs them re-entering only what
    they typed since the page loaded.
  */
  return 'This lease was changed somewhere else since you opened it — most likely a tenant returning their answers. Reload to pick up what they sent, then re-enter anything you have typed since.';
};
