import { createHash } from 'node:crypto';
import type { Event, NodeOptions } from '@sentry/node';

type TransactionEvent = Parameters<NonNullable<NodeOptions['beforeSendTransaction']>>[0];

import { logRouteCategory, safeError } from './safe-log-data';

const LEVELS = new Set(['fatal', 'error', 'warning', 'info', 'debug']);
const isHex = (value: unknown, length: number): value is string =>
  typeof value === 'string' && value.length === length && /^[a-f\d]+$/i.test(value);

/** Build a fresh export record; never clone vendor context, inputs or stacks. */
export const safeSentryEvent = (event: Event): Event => {
  const trace = event.contexts?.trace;
  const firstError = event.exception?.values?.[0];
  const error = safeError({ name: firstError?.type });
  const isTransaction = event.type === 'transaction';
  const frames = firstError?.stacktrace?.frames
    ?.slice(-20)
    .map(({ filename, function: name, lineno }) => [filename, name, lineno]);
  return {
    ...(isHex(event.event_id, 32) ? { event_id: event.event_id } : {}),
    ...(event.level && LEVELS.has(event.level) ? { level: event.level } : {}),
    ...(typeof event.timestamp === 'number' && Number.isFinite(event.timestamp) ? { timestamp: event.timestamp } : {}),
    ...(typeof event.start_timestamp === 'number' && Number.isFinite(event.start_timestamp)
      ? { start_timestamp: event.start_timestamp }
      : {}),
    tags: { routeCategory: logRouteCategory(event.request?.url) ?? 'other' },
    ...(trace && isHex(trace.trace_id, 32) && isHex(trace.span_id, 16)
      ? {
          contexts: { trace: { trace_id: trace.trace_id, span_id: trace.span_id, op: 'http.server' } },
        }
      : {}),
    ...(isTransaction
      ? { type: 'transaction', transaction: 'request', spans: [] }
      : {
          message: 'Server error; sensitive details omitted',
          exception: { values: [{ type: error.type, value: 'Sensitive error details omitted' }] },
          // Group by a one-way digest of code locations. No raw frame text leaves
          // the process; request-specific exception text does not affect grouping.
          fingerprint: [
            error.type,
            createHash('sha256')
              .update(JSON.stringify(frames ?? []))
              .digest('hex')
              .slice(0, 24),
          ],
        }),
  };
};

export const safeSentryOptions = {
  sendDefaultPii: false,
  enableLogs: false,
  beforeSendLog: () => null,
  includeLocalVariables: false,
  beforeBreadcrumb: () => null,
  beforeSend: safeSentryEvent,
  beforeSendTransaction: (event: TransactionEvent): TransactionEvent => ({
    ...safeSentryEvent(event),
    type: 'transaction',
    transaction: 'request',
    spans: [],
  }),
};
