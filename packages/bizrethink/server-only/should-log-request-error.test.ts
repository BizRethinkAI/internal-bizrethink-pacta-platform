import { describe, expect, it } from 'vitest';

import { shouldLogRequestError } from './should-log-request-error';

/**
 * The real "bot noise" fix (2026-08-13).
 *
 * react-router's DEFAULT server error handler `console.error`s every request
 * error — including 404s ("No route matches URL") and malformed-URL URIErrors
 * from scanner probes — and the only exempt mode is "test", so it logs in
 * production too. Each 404 emits a ~10-line stack trace, which is what flooded
 * the pacta-app logs. Documenso exports no custom `handleError`, so the default
 * runs. Overlay 063 adds a `handleError` to entry.server.tsx that consults this
 * predicate to suppress logging of expected/uninteresting request errors while
 * still surfacing genuine ones.
 */
describe('shouldLogRequestError', () => {
  it('suppresses aborted requests (client disconnected)', () => {
    expect(shouldLogRequestError(new Error('anything'), { aborted: true })).toBe(false);
  });

  it('suppresses 404 route errors (bot scans for non-existent routes)', () => {
    // react-router ErrorResponse shape (duck-typed by status).
    const routeError = { status: 404, statusText: 'Not Found', data: 'No route matches URL "/wp-login.php"' };
    expect(shouldLogRequestError(routeError)).toBe(false);
  });

  it('suppresses malformed-URL URIErrors (overlong-UTF-8 traversal probes)', () => {
    const uriError = new Error('URI malformed');
    uriError.name = 'URIError';
    expect(shouldLogRequestError(uriError)).toBe(false);

    // Also match by message even if name is generic.
    expect(shouldLogRequestError(new Error('The URL path could not be decoded (URI malformed).'))).toBe(false);
  });

  it('LOGS genuine 500-class errors', () => {
    expect(shouldLogRequestError(new Error('Cannot read properties of undefined'))).toBe(true);
    expect(shouldLogRequestError({ status: 500, statusText: 'Internal Server Error' })).toBe(true);
  });

  it('LOGS other 4xx that are not 404 (e.g. a real 403/400 bug)', () => {
    expect(shouldLogRequestError({ status: 403, statusText: 'Forbidden' })).toBe(true);
  });

  it('LOGS unknown/undefined errors (never silently swallow a surprise)', () => {
    expect(shouldLogRequestError(undefined)).toBe(true);
    expect(shouldLogRequestError('some string')).toBe(true);
  });
});
