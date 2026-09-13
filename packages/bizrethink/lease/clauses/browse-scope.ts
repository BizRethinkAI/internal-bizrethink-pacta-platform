import { PORTABLE_TIERS } from './approval-jurisdiction';

/** Browsing only; approval coverage is always assessed separately for a named jurisdiction. */
export const browseLeaseScope = <T extends { jurisdiction: string }>(items: T[], scope: string): T[] => {
  if (scope === 'all') {
    return items;
  }
  if (scope === 'shared') {
    return items.filter((item) => PORTABLE_TIERS.has(item.jurisdiction));
  }
  const state = scope === 'US-NC' ? 'US-NC' : 'US-FL';
  return items.filter((item) => PORTABLE_TIERS.has(item.jurisdiction) || item.jurisdiction === state);
};
