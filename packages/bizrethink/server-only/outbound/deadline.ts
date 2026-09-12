import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

/** The caller must destroy active sockets/streams when this signal aborts. */
export const withOutboundDeadline = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs = 10_000,
): Promise<T> => {
  const controller = new AbortController();
  const timeoutError = new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Outbound connection timed out.' });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort(timeoutError);
      reject(timeoutError);
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
};
