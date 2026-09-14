// MODIFIED for BizRethink (overlay 090): sanitize before Pino serialization and child bindings.
import { safeLoggingOptions } from '@bizrethink/customizations/server-only/logging/safe-log-data';
import { pino, type TransportTargetOptions } from 'pino';

import type { BaseApiLog } from '../types/api-logs';
import { env } from './env';

const transports: TransportTargetOptions[] = [];

if (env('NODE_ENV') !== 'production' && !env('INTERNAL_FORCE_JSON_LOGGER')) {
  transports.push({
    target: 'pino-pretty',
    level: 'info',
  });
}

const loggingFilePath = env('NEXT_PRIVATE_LOGGER_FILE_PATH');

if (loggingFilePath) {
  transports.push({
    target: 'pino/file',
    level: 'info',
    options: {
      destination: loggingFilePath,
      mkdir: true,
    },
  });
}

export const logger = pino({
  ...safeLoggingOptions,
  level: 'info',
  transport:
    transports.length > 0
      ? {
          targets: transports,
        }
      : undefined,
});

export const logDocumentAccess = ({
  request,
  documentId,
  userId,
}: {
  request: Request;
  documentId: number;
  userId: number;
}) => {
  const data: BaseApiLog = {
    path: new URL(request.url).pathname,
    auth: 'session',
    source: 'app',
    userId,
  };

  logger.info({
    ...data,
    event: 'document.access',
    documentId,
  });
};
