import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import { AppError, genericErrorCodeToTrpcErrorCodeMap } from '@documenso/lib/errors/app-error';
import { ZFillMcaDraftRequestSchema } from '../../server-only/trpc/templates/router.types';
import { renderMcaDraftPdf } from './pdf';
import { prepareMcaDraft } from './prepare';
import { readMcaDraftRequest } from './read-request';

/** Private stateless output; the server reloads the authorized current recipe for every download. */
export const downloadMcaDraftPdf = async (request: Request): Promise<Response> => {
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };
  if (request.method !== 'POST') {
    return Response.json({ message: 'Method not allowed' }, { status: 405, headers });
  }
  try {
    const { user } = await getOptionalSession(request);
    if (!user) {
      return Response.json({ message: 'Sign in to prepare a draft.' }, { status: 401, headers });
    }
    const input = ZFillMcaDraftRequestSchema.safeParse(await readMcaDraftRequest(request));
    if (!input.success) {
      return Response.json(
        { message: 'The draft request contains invalid or unsupported inputs.' },
        { status: 400, headers },
      );
    }
    const draft = await prepareMcaDraft({ ...input.data, userId: user.id });
    const pdf = await renderMcaDraftPdf(draft, input.data.version);
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...headers,
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="mca-internal-draft.pdf"',
      },
    });
  } catch (cause) {
    const error = AppError.parseError(cause);
    const status = error.statusCode ?? genericErrorCodeToTrpcErrorCodeMap[error.code]?.status ?? 500;
    return Response.json(
      { message: status >= 500 ? 'The draft could not be generated.' : error.message },
      { status, headers },
    );
  }
};
