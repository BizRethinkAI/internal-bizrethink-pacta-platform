import { MAX_DOCUMENT_MB } from '@bizrethink/customizations/lease/documents/placement';
import {
  attachLeaseDocument,
  resolveLeaseDocumentOwner,
} from '@bizrethink/customizations/lease/server-only/attach-document';
import { withUploadAdmission } from '@bizrethink/customizations/server-only/resources/admission';
import { readBoundedForm } from '@bizrethink/customizations/server-only/resources/bounded-body';
import { countBoundedPdfPages } from '@bizrethink/customizations/server-only/resources/media-worker';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { AppError } from '@documenso/lib/errors/app-error';

import type { ActionFunctionArgs } from 'react-router';

/**
 * Upload one governing document or condition report.
 *
 * A ROUTE OF OUR OWN RATHER THAN `/api/files/upload-pdf`. That endpoint caps at
 * `APP_DOCUMENT_UPLOAD_SIZE_LIMIT` (50 MB), a limit that exists because those
 * files go through the signing editor, where every page is rendered for field
 * placement. These never do — they are stored, listed and opened on their own.
 *
 * The limit is not academic: the real move-in inspection for one house is 418
 * pages and 54.7 MB, so uploading it through the upstream endpoint would fail,
 * and raising that endpoint's ceiling would relax the editor's guard for
 * everyone to solve a problem the editor does not have.
 *
 * Multipart rather than tRPC because tRPC carries JSON, and base64 in a JSON
 * body would inflate a 54 MB file by a third on the way up.
 *
 * The page count is settled HERE rather than in the documents package, because
 * the exact fallback needs a real PDF parser and that dependency belongs to the
 * app rather than to a package of pure lease logic.
 */

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ message: 'Method not allowed' }, { status: 405 });
  }

  const { user } = await getSession(request);

  try {
    return await withUploadAdmission(user.id, async () => {
      const form = await readBoundedForm(request, (MAX_DOCUMENT_MB + 1) * 1024 * 1024);
      const file = form.get('file');

      if (!(file instanceof File)) {
        return Response.json({ message: 'No file was uploaded.' }, { status: 400 });
      }

      if (file.size > MAX_DOCUMENT_MB * 1024 * 1024) {
        return Response.json({ message: `That file is larger than the ${MAX_DOCUMENT_MB} MB limit.` }, { status: 413 });
      }

      if (file.type !== 'application/pdf') {
        return Response.json({ message: 'Only PDF documents can be attached.' }, { status: 415 });
      }

      const asString = (key: string) => {
        const value = form.get(key);
        return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
      };

      const input = {
        userId: user.id,
        propertyId: asString('propertyId'),
        matterId: asString('matterId'),
        kind: asString('kind') ?? '',
        label: asString('label') ?? file.name.replace(/\.pdf$/i, ''),
        reference: asString('reference'),
        documentDate: asString('documentDate'),
        file,
      };
      await resolveLeaseDocumentOwner(input);
      const pageCount = await countBoundedPdfPages(new Uint8Array(await file.arrayBuffer()));
      const document = await attachLeaseDocument({ ...input, pageCount });

      return Response.json({ document }, { status: 201 });
    });
  } catch (error) {
    /*
      The placement and ownership errors are written to be read by the person
      who hit them — "a move-in report belongs to one lease, not to the
      property" — so they are surfaced rather than flattened into a 500.
    */
    const message = error instanceof Error ? error.message : 'The document could not be attached.';

    return Response.json({ message }, { status: error instanceof AppError ? (error.statusCode ?? 400) : 400 });
  }
}
