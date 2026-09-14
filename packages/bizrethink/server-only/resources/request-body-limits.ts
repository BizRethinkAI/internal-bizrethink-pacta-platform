import { AppError } from '@documenso/lib/errors/app-error';
import type { MiddlewareHandler } from 'hono';
import { withResourceSlot } from './admission';

/** Streaming outer limit: does not eagerly parse unauthenticated JSON/forms. */
export const requestBodyLimits: MiddlewareHandler = async (c, next) => {
  const request = c.req.raw;
  const body = request.body;
  if (!body || request.method === 'GET' || request.method === 'HEAD') {
    return next();
  }
  return withResourceSlot('request-body', 4, async () => {
    const path = new URL(request.url).pathname;
    const maxMiB = path.endsWith('/api/bizrethink.lease-document')
      ? 129
      : path.endsWith('/api/files/upload-pdf')
        ? 51
        : /\/api\/v(?:1|2|2-beta)\//.test(path)
          ? 70
          : path.includes('/api/trpc/')
            ? request.headers.get('content-type')?.includes('multipart/form-data')
              ? 70
              : 12
            : 2;
    const maximum = maxMiB * 1024 * 1024;
    const declared = request.headers.get('content-length');
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maximum)) {
      return c.json({ error: 'Request body exceeds the size limit.' }, 413);
    }
    const reader = body.getReader();
    let failure: 408 | 413 | undefined;
    let total = 0;
    let ended = false;
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const stop = (status: 408 | 413) => {
      if (ended) {
        return;
      }
      ended = true;
      failure = status;
      controller.error(new Error('Request body limit reached'));
      void reader.cancel().catch(() => undefined);
    };
    const stream = new ReadableStream<Uint8Array>(
      {
        start(value) {
          controller = value;
        },
        async pull(value) {
          try {
            const chunk = await reader.read();
            if (ended) {
              return;
            }
            if (chunk.done) {
              ended = true;
              value.close();
              return;
            }
            total += chunk.value.byteLength;
            if (total > maximum) {
              stop(413);
            } else {
              value.enqueue(chunk.value);
            }
          } catch (error) {
            if (!ended) {
              ended = true;
              value.error(error);
            }
          }
        },
        cancel(reason) {
          ended = true;
          return reader.cancel(reason);
        },
      },
      { highWaterMark: 0 },
    );
    const timer = setTimeout(() => stop(408), 30_000);
    c.req.raw = new Request(request, { body: stream, duplex: 'half' } as RequestInit);
    try {
      await next();
    } finally {
      clearTimeout(timer);
      // Parsing adapters may turn a stream error into a generic 400/500. Preserve
      // the limit's explicit status without returning a partially parsed result.
      if (failure) {
        c.res = c.json(
          { error: failure === 413 ? 'Request body exceeds the size limit.' : 'Request body timed out.' },
          failure,
        );
      }
    }
  }).catch((error) => {
    if (error instanceof AppError && error.code === 'TOO_MANY_REQUESTS') {
      return c.json({ error: 'Request processing capacity is busy. Try again shortly.' }, 429);
    }
    throw error;
  });
};
