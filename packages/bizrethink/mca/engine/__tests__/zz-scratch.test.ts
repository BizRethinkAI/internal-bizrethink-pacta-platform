import { describe, it } from 'vitest';
import { libraryFor } from '../../clauses/library';

describe('scratch', () => {
  it('prints 9.2 quotes', () => {
    for (const c of libraryFor('frpa')) {
      const m = c.body.match(/[^.]*Section 9\.2[^.]*\./g);
      if (m) {
        console.log(`${c.slug}\n   ${m.map((s) => s.trim()).join('\n   ')}`);
      }
    }
  });
});
