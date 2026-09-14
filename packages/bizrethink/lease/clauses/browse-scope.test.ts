import { describe, expect, it } from 'vitest';
import { browseLeaseScope } from './browse-scope';
import { ALL_CLAUSES, libraryFor } from './library';

describe('lease catalogue browsing scope', () => {
  it('matches canonical library membership and the actual shared intersection', () => {
    for (const state of ['US-FL', 'US-NC'] as const) {
      expect(browseLeaseScope(ALL_CLAUSES, state).map((item) => item.slug)).toEqual(
        libraryFor(state).map((item) => item.slug),
      );
    }
    const nc = new Set(libraryFor('US-NC').map((item) => item.slug));
    expect(browseLeaseScope(ALL_CLAUSES, 'shared').map((item) => item.slug)).toEqual(
      libraryFor('US-FL')
        .filter((item) => nc.has(item.slug))
        .map((item) => item.slug),
    );
    expect(browseLeaseScope(ALL_CLAUSES, 'all')).toEqual(ALL_CLAUSES);
  });
});
