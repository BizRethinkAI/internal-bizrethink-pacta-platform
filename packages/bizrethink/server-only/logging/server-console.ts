import { logger } from '@documenso/lib/utils/logger';
import type { ServerLogScope } from './log-scopes';
import { safeLogArguments } from './safe-log-data';

/** For legacy server diagnostics: retain source/level, never format raw inputs. */
export const createServerConsole = (component: ServerLogScope, bindings: { jobId?: string } = {}) => {
  const emit = (level: 'debug' | 'info' | 'warn' | 'error', args: unknown[]) => {
    const record = safeLogArguments(args);
    logger[level]({
      ...record,
      ...bindings,
      event: record.event === 'diagnostic.message' ? `server.${level}` : record.event,
      component,
    });
  };
  return {
    debug: (...args: unknown[]) => emit('debug', args),
    info: (...args: unknown[]) => emit('info', args),
    log: (...args: unknown[]) => emit('info', args),
    warn: (...args: unknown[]) => emit('warn', args),
    error: (...args: unknown[]) => emit('error', args),
  };
};
