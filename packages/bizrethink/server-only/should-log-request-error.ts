/**
 * Decide whether a react-router request error is worth logging.
 *
 * react-router's default server error handler `console.error`s EVERY request
 * error (the gate is only `serverMode !== "test"`, so production logs too).
 * Documenso ships no custom `handleError`, so 404s and malformed-URL probes —
 * overwhelmingly bot/scanner traffic — each emit a ~10-line stack trace and
 * flood the logs. Overlay 063 wires a `handleError` into entry.server.tsx that
 * uses this predicate to drop the uninteresting ones while still surfacing
 * genuine (500-class / unknown) errors.
 *
 * Kept as a pure, dependency-free predicate (duck-types the react-router
 * ErrorResponse `status` field rather than importing `isRouteErrorResponse`) so
 * it is trivially unit-testable and carries no runtime coupling.
 */
export function shouldLogRequestError(error: unknown, opts: { aborted?: boolean } = {}): boolean {
  // Client disconnected mid-request — nothing actionable.
  if (opts.aborted) {
    return false;
  }

  // 404s: react-router ErrorResponse ("No route matches URL ...") carries
  // status 404. These are almost entirely scanners probing for wp-login.php,
  // /.env, etc. The app correctly rejects them; logging a stack per hit is noise.
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status?: unknown }).status === 404
  ) {
    return false;
  }

  // Malformed-URL probes: react-router throws a URIError ("URI malformed") when
  // a scanner sends overlong-UTF-8 (%C0%AF) or bad percent-encoding paths.
  if (error instanceof Error && (error.name === 'URIError' || error.message.includes('URI malformed'))) {
    return false;
  }

  // Everything else (500s, unknown shapes) is genuine — always log.
  return true;
}
