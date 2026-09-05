import { pageLabel } from '@bizrethink/customizations/lease/documents/count-pages';
import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { AlertTriangle, FileText, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

/**
 * The association's governing documents, attached to the property.
 *
 * TO THE PROPERTY, NOT THE LEASE. A recorded declaration outlives every tenancy
 * on it, so uploading it once means next year's lease receipts the same
 * instruments with nobody re-uploading a few hundred pages. This is the same
 * argument that put the landlord and the utilities on the property.
 *
 * THE REFERENCE FIELD IS THE POINT, not metadata. What is printed on the
 * receipt addendum is what a signer can take to the county recorder to pull the
 * same instrument. A label alone — "Ninth Amendment" — identifies nothing: an
 * association may have amended nine times across two decades.
 *
 * The page count is never asked for. It is read off the file, because its whole
 * job on the receipt is to let a signer check that the document they opened is
 * the one the page names, and a typed figure would be a claim about the file
 * rather than a fact of it.
 */

export type GoverningDocumentEditorProps = {
  /**
   * Exactly one owner. Governing documents hang off the PROPERTY and outlive
   * the tenancy; a condition report hangs off the MATTER because it describes
   * one tenancy at one moment. The server refuses the wrong pairing — see
   * `assertDocumentPlacement` — so this is not the only thing holding the line.
   */
  propertyId?: string;
  matterId?: string;
  kind: 'hoa-governing' | 'move-in-report';
};

type Row = {
  id: string;
  label: string;
  reference: string | null;
  documentDate: string | Date | null;
  pageCount: number | null;
  sizeBytes: number;
};

const asDateInput = (value: string | Date | null): string => {
  if (!value) {
    return '';
  }

  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
};

const readableSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const GoverningDocumentEditor = ({ propertyId, matterId, kind }: GoverningDocumentEditorProps) => {
  const list = trpc.bizrethink.leaseBuilder.documents.list.useQuery({ propertyId, matterId });
  const update = trpc.bizrethink.leaseBuilder.documents.update.useMutation();
  const remove = trpc.bizrethink.leaseBuilder.documents.remove.useMutation();

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const documents = (list.data ?? []) as Row[];

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setError(null);
    setUploading(true);

    try {
      /*
        One at a time rather than in parallel. These are large scans, and the
        sort order is assigned by appending — firing them together would race
        for the same position and shuffle the list a signer reads.
      */
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append('file', file);

        if (propertyId) {
          body.append('propertyId', propertyId);
        }

        if (matterId) {
          body.append('matterId', matterId);
        }

        body.append('kind', kind);
        body.append('label', file.name.replace(/\.pdf$/i, ''));

        const response = await fetch('/api/bizrethink/lease-document', { method: 'POST', body });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message ?? `${file.name} could not be attached.`);
        }
      }

      await list.refetch();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The upload failed.');
    } finally {
      setUploading(false);

      if (fileInput.current) {
        fileInput.current.value = '';
      }
    }
  };

  const save = async (id: string, patch: { label?: string; reference?: string; documentDate?: string }) => {
    await update.mutateAsync({ id, ...patch });
    await list.refetch();
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>That document was not attached</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {documents.map((document) => (
        <div key={document.id} className="rounded border p-4">
          <div className="flex items-start justify-between gap-3">
            <FileText className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />

            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`label-${document.id}`}>What is it called?</Label>
                <Input
                  id={`label-${document.id}`}
                  defaultValue={document.label}
                  onBlur={(event) => void save(document.id, { label: event.target.value })}
                />
              </div>

              {/*
                Only a recorded instrument has one. A condition report is not
                filed anywhere, and an empty "Recording reference" box next to
                it invites someone to put something in it.
              */}
              {kind === 'hoa-governing' && (
                <div>
                  <Label htmlFor={`reference-${document.id}`}>Recording reference</Label>
                  <Input
                    id={`reference-${document.id}`}
                    defaultValue={document.reference ?? ''}
                    placeholder="Instr# 2021271188, OR 10509/675"
                    onBlur={(event) => void save(document.id, { reference: event.target.value })}
                  />
                  <p className="mt-1 text-muted-foreground text-xs">
                    Printed on the addendum exactly as typed, so a tenant can look the document up themselves.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor={`date-${document.id}`}>Date on the document</Label>
                <Input
                  id={`date-${document.id}`}
                  type="date"
                  defaultValue={asDateInput(document.documentDate)}
                  onBlur={(event) => void save(document.id, { documentDate: event.target.value })}
                />
              </div>

              <p className="self-end text-muted-foreground text-xs">
                {pageLabel(document.pageCount)} · {readableSize(document.sizeBytes)}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await remove.mutateAsync({ id: document.id });
                await list.refetch();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      {documents.length === 0 && !list.isPending && (
        <p className="text-muted-foreground text-sm">
          {kind === 'hoa-governing'
            ? 'Nothing attached yet. Without these the lease still requires the tenant to comply with the association\u2019s documents, but no addendum records that they were given them.'
            : 'Nothing attached yet. Without a condition report there is no agreed record of what the property looked like at move-in, which is what a deposit deduction rests on.'}
        </p>
      )}

      <div>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(event) => void upload(event.target.files)}
        />

        <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? 'Attaching…' : 'Attach a document'}
        </Button>
      </div>
    </div>
  );
};
