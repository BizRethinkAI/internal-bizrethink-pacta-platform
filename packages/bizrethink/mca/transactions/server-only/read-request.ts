import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

const MAX_BYTES = 600_000;
const invalid = (message: string, statusCode: number): never => {
  throw new AppError(AppErrorCode.INVALID_BODY, { message, statusCode });
};

/** Stop at the byte limit; do not buffer an arbitrary request before checking its size. */
export const readMcaDraftRequest = async (request: Request): Promise<unknown> => {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    invalid('Supply a JSON draft request.', 415);
  }
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES) {
    invalid('This draft input is too large.', 413);
  }
  const reader = request.body?.getReader();
  if (!reader) {
    return invalid('Supply a JSON draft request.', 400);
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        invalid('This draft input is too large.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return invalid('Supply a JSON draft request.', 400);
  }
};
