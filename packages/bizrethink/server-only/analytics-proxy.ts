const API_HOST = 'eu.i.posthog.com';
const ASSET_HOST = 'eu-assets.i.posthog.com';
const REQUEST_HEADERS = ['accept', 'content-type', 'content-encoding'];
const CACHE_REQUEST_HEADERS = ['if-none-match', 'if-modified-since'];
const RESPONSE_HEADERS = ['content-type', 'cache-control', 'etag', 'last-modified', 'vary'];

/** Forward analytics content, never the application's ambient credentials. */
export const posthogProxy = async (request: Request): Promise<Response> => {
  const incoming = new URL(request.url);
  const isAsset = incoming.pathname.startsWith('/ingest/static/');
  // Assign pathname separately: an input beginning // must not choose a host.
  const target = new URL(`https://${isAsset ? ASSET_HOST : API_HOST}`);
  target.pathname = incoming.pathname.replace(/^\/ingest/, '');
  target.search = incoming.search;
  const headers = new Headers();
  for (const name of [...REQUEST_HEADERS, ...(isAsset ? CACHE_REQUEST_HEADERS : [])]) {
    const value = request.headers.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }
  const options: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    credentials: 'omit',
    redirect: 'error',
    signal: request.signal,
  };
  if (!['GET', 'HEAD'].includes(request.method)) {
    options.body = request.body;
    options.duplex = 'half';
  }
  try {
    const upstream = await fetch(target, options);
    const responseHeaders = new Headers();
    for (const name of RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value !== null) {
        responseHeaders.set(name, value);
      }
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return new Response('Analytics provider unavailable', { status: 502 });
  }
};
