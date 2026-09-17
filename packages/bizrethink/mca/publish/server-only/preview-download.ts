import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import { AppError, genericErrorCodeToTrpcErrorCodeMap } from '@documenso/lib/errors/app-error';
import { assertUserNotDisabled } from '@documenso/lib/server-only/user/assert-user-not-disabled';
import { z } from 'zod';

import { previewMcaTemplate } from '../../templates/server-only/service';
import { PRODUCED_INSTRUMENTS } from '../recipient-contract';
import { renderMcaTemplatePreviewPdf } from './specimen';

/**
 * Download a preview of a template.
 *
 * ADR 0025: the artifact is a template and a deal never enters this vertical, so
 * there is nothing to fill in before previewing one. The whole request is which
 * template, which revision, which document.
 *
 * ACCESS IS DECIDED BY `previewMcaTemplate`, NOT HERE. It checks live team
 * membership, the separate `mca-clause-draft-rendering` grant, and that the
 * revision still compiles to what it compiled to. Repeating any of that here
 * would be two checks that can disagree, and the one that disagrees quietly is
 * always the one nobody is reading.
 */
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };

/**
 * `split-funding` is absent on purpose: ADR 0019 makes the letter the
 * processor's, used exactly as supplied, and the builder produces none.
 */
const ZPreviewRequest = z.object({
  /** The team whose template this is; membership is then checked against it. */
  teamId: z.number().int().positive(),
  id: z.string().min(1).max(120),
  version: z.number().int().positive(),
  instrument: z.enum(PRODUCED_INSTRUMENTS),
});

/** A template reference is four small fields; anything larger is not one. */
const MAX_BYTES = 4_000;

const readReference = async (request: Request): Promise<unknown> => {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return null;
  }

  if (Number(request.headers.get('Content-Length')) > MAX_BYTES) {
    return null;
  }

  try {
    const body = await request.text();

    return body.length > MAX_BYTES ? null : JSON.parse(body);
  } catch {
    return null;
  }
};

export const downloadMcaTemplatePreview = async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return Response.json({ message: 'Method not allowed' }, { status: 405, headers });
  }

  try {
    const { user } = await getOptionalSession(request);

    if (!user) {
      return Response.json({ message: 'Sign in to preview a template.' }, { status: 401, headers });
    }

    assertUserNotDisabled(user);

    const input = ZPreviewRequest.safeParse(await readReference(request));

    if (!input.success) {
      return Response.json(
        { message: 'Name the template, its revision and which document to preview.' },
        { status: 400, headers },
      );
    }

    const snapshot = await previewMcaTemplate({
      userId: user.id,
      teamId: input.data.teamId,
      id: input.data.id,
      version: input.data.version,
    });

    const pdf = await renderMcaTemplatePreviewPdf(snapshot, input.data.instrument, input.data.version);

    return new Response(new Uint8Array(pdf), {
      headers: {
        ...headers,
        'Content-Type': 'application/pdf',
        // The filename says what it is. A file called `mca.pdf` in somebody's
        // downloads folder a week later is how a preview gets mistaken for the
        // thing it previews.
        'Content-Disposition': `attachment; filename="mca-${input.data.instrument}-preview.pdf"`,
      },
    });
  } catch (cause) {
    const error = AppError.parseError(cause);
    const status = error.statusCode ?? genericErrorCodeToTrpcErrorCodeMap[error.code]?.status ?? 500;

    return Response.json(
      { message: status >= 500 ? 'The preview could not be generated.' : error.message },
      { status, headers },
    );
  }
};
