import { readBoundedBytes } from './bounded-body';

/** Provider JSON is bounded before the SDK parses it; redirects never carry credentials. */
export const boundedAiFetch: typeof fetch = async (input, init) => {
  const inherited = init?.signal ?? (input instanceof Request ? input.signal : null);
  const signal = AbortSignal.any([...(inherited ? [inherited] : []), AbortSignal.timeout(20_000)]);
  const response = await fetch(input, { ...init, signal, redirect: 'error' });
  if (!response.body) {
    return response;
  }
  const bytes = await readBoundedBytes(
    { headers: response.headers, body: response.body, signal },
    { maxBytes: 1024 * 1024, timeoutMs: 20_000 },
  );
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  return new Response(new Uint8Array(bytes), { status: response.status, statusText: response.statusText, headers });
};
