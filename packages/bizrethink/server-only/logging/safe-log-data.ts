import { AuthenticationErrorCode } from '@documenso/auth/server/lib/errors/error-codes';
import { AppErrorCode } from '@documenso/lib/errors/app-error';
import { sha256 } from '@documenso/lib/universal/crypto';
import { bytesToHex } from '@noble/ciphers/utils';
import type { LoggerOptions } from 'pino';
import { SERVER_LOG_SCOPES } from './log-scopes';

const COMPONENTS = new Set<string>(SERVER_LOG_SCOPES);

const EVENTS = new Set([
  'signup.closed',
  'invitation.claim-failed',
  'verification.claim-failed',
  'diagnostic.message',
  'document.access',
  'document.access.attempt',
  'job.received',
  'job.failed',
  'job.task',
  'request.failed',
  'server.log',
  'server.error',
  'server.warn',
  'server.info',
  'server.debug',
]);
const ERROR_NAMES = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'URIError',
  'AppError',
  'TRPCError',
  'ZodError',
  'AbortError',
  'TimeoutError',
  'PrismaClientKnownRequestError',
  'PrismaClientUnknownRequestError',
  'PrismaClientValidationError',
  'PrismaClientInitializationError',
  'BackgroundTaskFailedError',
  'BackgroundTaskExceededRetriesError',
]);
const ERROR_CODES = new Set<string>([
  ...Object.values(AppErrorCode),
  ...Object.values(AuthenticationErrorCode),
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'ENOENT',
  'EACCES',
  'EPERM',
  'ENOMEM',
  'ERR_HTTP_HEADERS_SENT',
  'ERR_STREAM_PREMATURE_CLOSE',
]);
const IDS = new Set([
  'requestId',
  'nonBatchedRequestId',
  'documentId',
  'envelopeId',
  'templateId',
  'recipientId',
  'fieldId',
  'userId',
  'teamId',
  'organisationId',
  'apiTokenId',
  'jobId',
  'taskId',
  'unverifiedTeamId',
]);
const NUMBERS = new Set(['statusCode', 'httpStatus', 'count', 'durationMs', 'attempt', 'retried', 'maxRetries', 'pid']);
const ENUMS: Record<string, ReadonlySet<string>> = {
  reason: new Set(['settings-unavailable', 'settings-invalid']),
  auth: new Set(['session', 'api', 'none']),
  source: new Set(['app', 'apiV1', 'apiV2']),
  status: new Set([
    'error',
    'success',
    'pending',
    'completed',
    'failed',
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
  ]),
  trpcMiddleware: new Set(['authenticated', 'maybeAuthenticated', 'admin', 'procedure']),
};

// Reading only data descriptors avoids invoking toJSON, getters or custom
// inspection. Inputs/payloads/headers are deliberately not traversed at all.
const own = (value: unknown, key: string): unknown => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  try {
    return Object.getOwnPropertyDescriptor(value, key)?.value;
  } catch {
    return undefined;
  }
};
const errorProperty = (value: unknown, key: string): unknown => {
  let current = value;
  for (let depth = 0; current && typeof current === 'object' && depth < 4; depth++) {
    const result = own(current, key);
    if (result !== undefined) {
      return result;
    }
    try {
      current = Object.getPrototypeOf(current);
    } catch {
      return undefined;
    }
  }
  return undefined;
};
export const safeError = (error: unknown) => {
  const name = errorProperty(error, 'name') ?? own(error, 'type');
  const code = errorProperty(error, 'code');
  const statusCode = errorProperty(error, 'statusCode');
  return {
    type: typeof name === 'string' && ERROR_NAMES.has(name) ? name : 'Error',
    ...(typeof code === 'string' && (ERROR_CODES.has(code) || /^P\d{4}$/.test(code)) ? { code } : {}),
    ...(typeof statusCode === 'number' && Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599
      ? { statusCode }
      : {}),
  };
};
export const logRouteCategory = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined;
  }
  // Do not emit route parameters, queries, unknown segments, or raw URLs.
  const route = value.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  for (const prefix of [
    '/api/auth',
    '/api/trpc',
    '/api/v1',
    '/api/v2-beta',
    '/api/v2',
    '/api/files',
    '/api/jobs',
    '/api/csc',
    '/api/ai',
    '/sign',
    '/d',
    '/verify-email',
    '/reset-password',
    '/ingest',
  ]) {
    if (route === prefix || route.startsWith(`${prefix}/`)) {
      return prefix;
    }
  }
  return 'other';
};
const correlation = (value: string, isRequestId: boolean) => {
  if (/^sha256:[a-f\d]{24}$/.test(value)) {
    return value;
  }
  if (isRequestId && /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)) {
    return value;
  }
  // Keep stable correlation without echoing an accidentally supplied bearer.
  // Shared constants retain lazy server-config modules in Vite's client graph.
  // Use the existing universal primitive without importing a Node-only API.
  return `sha256:${bytesToHex(sha256(value.slice(0, 4096))).slice(0, 24)}`;
};
export const safeLogRecord = (input: unknown): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (!input || typeof input !== 'object') {
    return result;
  }
  const component = own(input, 'component');
  if (typeof component === 'string' && COMPONENTS.has(component)) {
    result.component = component;
  }
  const event = own(input, 'event');
  if (typeof event === 'string' && EVENTS.has(event)) {
    result.event = event;
  }
  for (const key of IDS) {
    const value = own(input, key);
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
      result[key] = value;
    } else if (typeof value === 'string' && value.length > 0) {
      result[key] = correlation(value, key === 'requestId' || key === 'nonBatchedRequestId');
    }
  }
  for (const key of NUMBERS) {
    const value = own(input, key);
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      result[key] = value;
    }
  }
  for (const [key, values] of Object.entries(ENUMS)) {
    const value = own(input, key);
    if (typeof value === 'string' && values.has(value)) {
      result[key] = value;
    }
  }
  const category = own(input, 'routeCategory');
  if (typeof category === 'string') {
    result.routeCategory = logRouteCategory(category);
  }
  const route = own(input, 'requestPath') ?? own(input, 'path');
  if (typeof route === 'string') {
    result.routeCategory = logRouteCategory(route);
  }
  for (const key of ['err', 'error']) {
    const value = own(input, key);
    if (value !== undefined) {
      result[key] = safeError(value);
    }
  }
  return result;
};
export const safeLogArguments = (args: readonly unknown[]) => {
  const record = { event: 'diagnostic.message', ...safeLogRecord(args[0]) };
  for (const value of args.slice(0, 8)) {
    if (value instanceof Error) {
      Object.assign(record, { err: safeError(value) });
      break;
    }
  }
  return record;
};

/** Runs before Pino serializers and interpolation, including child bindings. */
export const safeLoggingOptions: Pick<LoggerOptions, 'hooks' | 'formatters'> = {
  hooks: {
    logMethod(args, method) {
      method.call(this, safeLogArguments(args));
    },
    // Pino resets its binding formatter on child creation. Enforce the same
    // policy at the final serialized boundary, including nested children,
    // child serializers, mixins, setBindings and message prefixes.
    streamWrite(serialized) {
      try {
        const record: unknown = JSON.parse(serialized);
        const rawLevel = own(record, 'level');
        const rawTime = own(record, 'time');
        const level =
          typeof rawLevel === 'number' && Number.isInteger(rawLevel) && rawLevel >= 10 && rawLevel <= 60
            ? rawLevel
            : 30;
        const time = typeof rawTime === 'number' && Number.isFinite(rawTime) && rawTime >= 0 ? rawTime : Date.now();
        return JSON.stringify({ level, time, ...safeLogRecord(record) }) + '\n';
      } catch {
        return '{"level":50,"event":"server.error"}\n';
      }
    },
  },
  formatters: { bindings: safeLogRecord },
};
