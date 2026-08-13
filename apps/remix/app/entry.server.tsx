import { PassThrough } from 'node:stream';
import { shouldLogRequestError } from '@bizrethink/customizations/server-only/should-log-request-error';
import { APP_I18N_OPTIONS } from '@documenso/lib/constants/i18n';
import { dynamicActivate, extractLocaleData } from '@documenso/lib/utils/i18n';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { createReadableStreamFromReadable } from '@react-router/node';
import { isbot } from 'isbot';
import type { RenderToPipeableStreamOptions } from 'react-dom/server';
import { renderToPipeableStream } from 'react-dom/server';
import type { AppLoadContext, EntryContext, HandleErrorFunction } from 'react-router';
import { ServerRouter } from 'react-router';

import { langCookie } from './storage/lang-cookie.server';

export const streamTimeout = 5_000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext,
) {
  let language = await langCookie.parse(request.headers.get('cookie') ?? '');

  if (!APP_I18N_OPTIONS.supportedLangs.includes(language)) {
    language = extractLocaleData({ headers: request.headers }).lang;
  }

  await dynamicActivate(language);

  // Threaded into ServerRouter so React Router applies the nonce to the
  // scripts it injects (route manifest, hydration data, module preloads).
  // The same nonce is also exposed to the React tree via the root loader so
  // our own inline scripts/styles can carry it.
  const nonce = loadContext.nonce || undefined;

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get('user-agent');

    // Ensure requests from bots and SPA Mode renders wait for all content to load before responding
    // https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
    const readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode ? 'onAllReady' : 'onShellReady';

    const { pipe, abort } = renderToPipeableStream(
      <I18nProvider i18n={i18n}>
        <ServerRouter context={routerContext} url={request.url} nonce={nonce} />
      </I18nProvider>,
      {
        nonce,
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    // Abort the rendering stream after the `streamTimeout` so it has time to
    // flush down the rejected boundaries
    setTimeout(abort, streamTimeout + 1000);
  });
}

// BizRethink (overlay 063): react-router's default server error handler
// console.errors EVERY request error — including 404s ("No route matches URL")
// and malformed-URL URIErrors from bot/scanner probes — in production as well
// as development (the only exempt mode is "test"). Each 404 emits a ~10-line
// stack trace, which is what floods the pacta-app logs. Providing a custom
// `handleError` lets us drop the uninteresting request errors while still
// surfacing (and letting Sentry capture) genuine 500-class ones. Decision logic
// lives in the tested @bizrethink/customizations predicate.
export const handleError: HandleErrorFunction = (error, { request }) => {
  if (!shouldLogRequestError(error, { aborted: request.signal.aborted })) {
    return;
  }

  console.error(error);
};
