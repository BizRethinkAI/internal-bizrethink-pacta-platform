import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';

/*
  Where a signer opens a governing document, and all of them at once.

  One place, because three things print these — the envelope's attachment list,
  the receipt addendum and the download-all route's own links — and a signer
  matching one against another must find the same address.
*/
const base = () => NEXT_PUBLIC_WEBAPP_URL().replace(/\/$/, '');

export const governingDocumentUrl = (matterId: string, documentId: string): string =>
  `${base()}/lease-attachment/${matterId}/${documentId}`;

export const governingBundleUrl = (matterId: string): string => `${base()}/lease-attachment/${matterId}/all`;
