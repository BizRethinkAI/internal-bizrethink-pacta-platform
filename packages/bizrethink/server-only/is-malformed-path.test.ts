import { describe, expect, it } from 'vitest';

import { isMalformedPath } from './is-malformed-path';

/**
 * Part 2 of the "bot noise" fix (2026-08-13).
 *
 * react-router's decodePath() runs decodeURIComponent() on each "/"-split path
 * segment during route matching, ONCE PER route pattern it tries. A malformed
 * segment (overlong-UTF-8 %C0%AF traversal probes, bad percent-encoding) throws
 * URIError, and react-router logs a warning each time — ~14 lines for a single
 * scanner request, none of which pass through `handleError`. Overlay 064 adds a
 * hono guard that 400s these paths BEFORE matching, using this predicate.
 */
describe('isMalformedPath', () => {
  it('passes normal paths', () => {
    for (const p of ['/', '/signin', '/documents/123', '/wp-login.php', '/.env', '/a/b/c']) {
      expect(isMalformedPath(p), p).toBe(false);
    }
  });

  it('passes validly percent-encoded paths', () => {
    // %20 = space, %2F = encoded slash — both decode fine.
    expect(isMalformedPath('/hello%20world')).toBe(false);
    expect(isMalformedPath('/a%2Fb')).toBe(false);
  });

  it('flags overlong-UTF-8 traversal probes (%C0%AF)', () => {
    expect(isMalformedPath('/..%C0%AF..%C0%AFetc/passwd')).toBe(true);
    expect(isMalformedPath('/..%C0%AFvar/www/html/.git/config')).toBe(true);
  });

  it('flags bad/incomplete percent-encoding', () => {
    expect(isMalformedPath('/%')).toBe(true);
    expect(isMalformedPath('/%zz')).toBe(true);
    expect(isMalformedPath('/foo%E0%A4bar')).toBe(true);
  });
});
