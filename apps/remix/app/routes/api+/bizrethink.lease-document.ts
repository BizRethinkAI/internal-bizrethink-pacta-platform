import { MAX_DOCUMENT_MB } from '@bizrethink/customizations/lease/documents/placement';
import { attachLeaseDocument } from '@bizrethink/customizations/lease/server-only/attach-document';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';

import type { Route } from './+types/bizrethink.lease-document';

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
 */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ message: 'Method not allowed' }, { status: 405 });
  }

  const { user } = await getSession(request);

  const form = await request.formData();
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

  try {
    const document = await attachLeaseDocument({
      userId: user.id,
      propertyId: asString('propertyId'),
      matterId: asString('matterId'),
      kind: asString('kind') ?? '',
      label: asString('label') ?? file.name.replace(/\.pdf$/i, ''),
      reference: asString('reference'),
      documentDate: asString('documentDate'),
      file,
    });

    return Response.json({ document }, { status: 201 });
  } catch (error) {
    /*
      The placement and ownership errors are written to be read by the person
      who hit them — "a move-in report belongs to one lease, not to the
      property" — so they are surfaced rather than flattened into a 500.
    */
    const message = error instanceof Error ? error.message : 'The document could not be attached.';

    return Response.json({ message }, { status: 400 });
  }
}
