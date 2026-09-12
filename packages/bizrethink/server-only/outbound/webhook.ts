import { type IncomingMessage, request as requestHttp } from 'node:http';
import { request as requestHttps } from 'node:https';
import { isIP } from 'node:net';
import { Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { checkServerIdentity } from 'node:tls';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { Prisma } from '@prisma/client';

import { withOutboundDeadline } from './deadline';
import { normalizeOutboundHostname, type OutboundLookup, resolveOutboundDestination } from './destination';

export const WEBHOOK_RESPONSE_BODY_LIMIT = 64 * 1024;
export const WEBHOOK_RESPONSE_HEADERS_LIMIT = 8 * 1024;

export type WebhookCallResult = {
  success: boolean;
  responseCode: number;
  responseBody: Prisma.InputJsonValue | Prisma.JsonNullValueInput;
  responseHeaders: Record<string, string>;
};

const invalidWebhook = () =>
  new AppError(AppErrorCode.WEBHOOK_INVALID_REQUEST, {
    message: 'Webhook destination is not permitted or could not be resolved.',
  });

const resolveWebhook = async (input: string, options?: { lookup?: OutboundLookup; signal?: AbortSignal }) => {
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw invalidWebhook();
    }
    const hostname = normalizeOutboundHostname(url.hostname);
    // Preserve overlay 017's deferred config load: eager Prisma/config imports
    // from the upstream webhook helpers form a build-time dependency cycle.
    const { getWebhookSsrfBypassHosts } = await import('../webhook-config');
    options?.signal?.throwIfAborted();
    const exceptions = await getWebhookSsrfBypassHosts();
    options?.signal?.throwIfAborted();
    const allowPrivate = [...exceptions].some((entry) => {
      try {
        return normalizeOutboundHostname(entry) === hostname;
      } catch {
        return false;
      }
    });
    const destination = await resolveOutboundDestination(hostname, { allowPrivate, lookup: options?.lookup });
    return { url, destination };
  } catch {
    throw invalidWebhook();
  }
};

/** Creation/editing guard. Delivery must resolve again and use the returned IP. */
export const assertSafeWebhookUrl = async (url: string, options?: { lookup?: OutboundLookup }): Promise<void> => {
  try {
    await withOutboundDeadline((signal) => resolveWebhook(url, { ...options, signal }));
  } catch {
    throw invalidWebhook();
  }
};

const responseLimitError = () =>
  new AppError(AppErrorCode.LIMIT_EXCEEDED, {
    message: 'Webhook response exceeded its size limit.',
  });

const readResponse = async (response: IncomingMessage, signal: AbortSignal) => {
  const chunks: Buffer[] = [];
  let wireBytes = 0;
  let decodedBytes = 0;
  const wireLimit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      wireBytes += chunk.length;
      callback(wireBytes > WEBHOOK_RESPONSE_BODY_LIMIT ? responseLimitError() : null, chunk);
    },
  });
  const collector = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      decodedBytes += chunk.length;
      if (decodedBytes > WEBHOOK_RESPONSE_BODY_LIMIT) {
        callback(responseLimitError());
        return;
      }
      chunks.push(chunk);
      callback();
    },
  });
  const encoding = response.headers['content-encoding']?.trim().toLowerCase();
  const decoder =
    encoding === 'gzip'
      ? createGunzip()
      : encoding === 'deflate'
        ? createInflate()
        : encoding === 'br'
          ? createBrotliDecompress()
          : undefined;
  if (encoding && encoding !== 'identity' && !decoder) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Unsupported webhook response encoding.' });
  }
  if (decoder) {
    await pipeline(response, wireLimit, decoder, collector, { signal });
  } else {
    await pipeline(response, wireLimit, collector, { signal });
  }
  // Node's HTTP parser bounds headers/trailers before exposing them. Also keep
  // their combined retained representation inside the same diagnostic budget.
  if (
    [...response.rawHeaders, ...response.rawTrailers].reduce(
      (total, value) => total + Buffer.byteLength(value) + 4,
      0,
    ) > WEBHOOK_RESPONSE_HEADERS_LIMIT
  ) {
    throw responseLimitError();
  }
  const text = new TextDecoder().decode(Buffer.concat(chunks, decodedBytes));
  let responseBody: Prisma.InputJsonValue;
  try {
    responseBody = JSON.parse(text);
  } catch {
    responseBody = text;
  }
  const responseCode = response.statusCode ?? 0;
  return {
    success: responseCode >= 200 && responseCode < 300,
    responseCode,
    responseBody,
    responseHeaders: Object.fromEntries(
      Object.entries(response.headers)
        .filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)
        .map(([name, value]) => [name, Array.isArray(value) ? value.join(', ') : value]),
    ),
  };
};

export const executeSafeWebhookCall = async (options: {
  url: string;
  body: unknown;
  secret: string | null;
}): Promise<WebhookCallResult> => {
  try {
    return await withOutboundDeadline(async (signal) => {
      const { url, destination } = await resolveWebhook(options.url, { signal });
      signal.throwIfAborted();
      const payload = JSON.stringify(options.body);
      const request = url.protocol === 'https:' ? requestHttps : requestHttp;
      return await new Promise<WebhookCallResult>((resolve, reject) => {
        const req = request(
          {
            protocol: url.protocol,
            hostname: destination.address,
            family: destination.family,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: 'POST',
            // Numeric destination + fresh agent: no unchecked DNS lookup, reused
            // socket, redirects, or environment-proxy/global-agent substitution.
            agent: false,
            signal,
            maxHeaderSize: WEBHOOK_RESPONSE_HEADERS_LIMIT,
            servername: isIP(destination.hostname) ? undefined : destination.hostname,
            rejectUnauthorized: true,
            checkServerIdentity: (_hostname, certificate) => checkServerIdentity(destination.hostname, certificate),
            headers: {
              Host: url.host,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
              'Accept-Encoding': 'gzip, deflate, br',
              'X-Documenso-Secret': options.secret ?? '',
            },
          },
          (response) => {
            void readResponse(response, signal).then(resolve, (error: unknown) => {
              response.destroy();
              req.destroy();
              reject(error);
            });
          },
        );
        req.once('error', reject);
        req.end(payload);
      });
    });
  } catch (error) {
    return {
      success: false,
      responseCode: 0,
      responseBody: error instanceof AppError ? error.message : 'Webhook request failed.',
      responseHeaders: {},
    };
  }
};
