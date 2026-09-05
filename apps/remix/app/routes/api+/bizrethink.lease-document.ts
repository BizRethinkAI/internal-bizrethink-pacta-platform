import { countPagesFromBytes } from '@bizrethink/customizations/lease/documents/count-pages';
import { MAX_DOCUMENT_MB } from '@bizrethink/customizations/lease/documents/placement';
import { attachLeaseDocument } from '@bizrethink/customizations/lease/server-only/attach-document';
import { PDFDocument } from '@cantoo/pdf-lib';
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
 *
 * The page count is settled HERE rather than in the documents package, because
 * the exact fallback needs a real PDF parser and that dependency belongs to the
 * app rather than to a package of pure lease logic.
 */

/**
 * Pages: the cheap scan first, a real parse only when it comes back empty.
 *
 * The scan reads most files exactly and costs one pass over the bytes. It
 * cannot see the pages of a linearised PDF, whose page objects live in
 * compressed object streams — the Estancia master declaration is one of those,
 * 155 pages of which the scan finds none.
 *
 * Parsing settles it (155 in ~40 ms; the 418-page, 54 MB inspection in ~400 ms),
 * but only on the files that need it. A parse failure is not an upload failure:
 * an encrypted or malformed PDF still stores, and the receipt simply omits the
 * extent rather than asserting one nobody established.
 */
const countPages = async (bytes: Uint8Array): Promise<number | null> => {
  const scanned = countPagesFromBytes(bytes);

  if (scanned !== null) {
    return scanned;
  }

  try {
    const parsed = await PDFDocument.load(bytes, { updateMetadata: false });

    return parsed.getPageCount();
  } catch {
    return null;
  }
};
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
      pageCount: await countPages(new Uint8Array(await file.arrayBuffer())),
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
