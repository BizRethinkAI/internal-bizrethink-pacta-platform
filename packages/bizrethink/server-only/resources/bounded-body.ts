import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

export const bodyLimitError = (statusCode: 400 | 408 | 413, message: string) =>
  new AppError(AppErrorCode.INVALID_BODY, { statusCode, message });

/** Count bytes while reading, including chunked input and every multipart part. */
export const readBoundedBytes = async (
  source: { headers: Headers; body: ReadableStream<Uint8Array> | null; signal?: AbortSignal },
  { maxBytes, timeoutMs = 30_000 }: { maxBytes: number; timeoutMs?: number },
): Promise<Buffer> => {
  const declared = source.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    void source.body?.cancel().catch(() => undefined);
    throw bodyLimitError(413, 'Request body exceeds the size limit.');
  }
  if (!source.body) {
    return Buffer.alloc(0);
  }
  const reader = source.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let complete = false;
  let abort = () => {};
  const aborted = new Promise<never>((_resolve, reject) => {
    abort = () => reject(bodyLimitError(408, 'The request body timed out or was cancelled.'));
  });
  const timer = setTimeout(abort, timeoutMs);
  source.signal?.addEventListener('abort', abort, { once: true });
  try {
    if (source.signal?.aborted) {
      throw bodyLimitError(408, 'The request was cancelled.');
    }
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), aborted]);
      if (done) {
        complete = true;
        return Buffer.concat(chunks, received);
      }
      received += value.byteLength;
      if (received > maxBytes) {
        throw bodyLimitError(413, 'Request body exceeds the size limit.');
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(timer);
    source.signal?.removeEventListener('abort', abort);
    if (!complete) {
      void reader.cancel().catch(() => undefined);
    }
    reader.releaseLock();
  }
};

export const readBoundedForm = async (request: Request, maxBytes: number) => {
  const bytes = await readBoundedBytes(request, { maxBytes });
  try {
    return await new Response(new Uint8Array(bytes), {
      headers: { 'content-type': request.headers.get('content-type') ?? '' },
    }).formData();
  } catch {
    throw bodyLimitError(400, 'Invalid multipart form.');
  }
};
