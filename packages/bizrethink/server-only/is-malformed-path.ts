/**
 * True if a URL pathname has a segment that cannot be percent-decoded.
 *
 * Mirrors react-router's internal `decodePath()` (which runs
 * `decodeURIComponent()` on each "/"-split segment during route matching). When
 * a segment is malformed — overlong-UTF-8 `%C0%AF` traversal probes, bad/
 * incomplete percent-encoding — react-router throws URIError and logs a warning
 * ONCE PER route pattern it tries (~14 lines per scanner request), none of
 * which reach `handleError`. Overlay 064 uses this in a hono guard to reject
 * such paths with a 400 BEFORE matching, so the warnings never fire.
 *
 * Pure and dependency-free for easy unit testing.
 */
export function isMalformedPath(pathname: string): boolean {
  try {
    for (const segment of pathname.split('/')) {
      decodeURIComponent(segment);
    }
    return false;
  } catch {
    // decodeURIComponent throws URIError on malformed input — exactly the case
    // react-router would warn about.
    return true;
  }
}
