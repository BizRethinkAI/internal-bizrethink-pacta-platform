import { env } from '@documenso/lib/utils/env';

import { AzureBlobProvider } from './azure-blob-provider';
import { S3Provider } from './s3-provider';
import type { StorageProvider } from './storage-provider';

export type { PresignedUrl, StorageProvider, UploadFileInput, UploadFileResult } from './storage-provider';

let cached: StorageProvider | null = null;

export const getStorageProvider = (): StorageProvider => {
  if (cached) {
    return cached;
  }

  const transport = env('NEXT_PUBLIC_UPLOAD_TRANSPORT');

  switch (transport) {
    case 'azure-blob':
      cached = new AzureBlobProvider();
      return cached;
    // MODIFIED for BizRethink (overlay 013): upstream threw here for any value
    // other than 's3' / 'azure-blob'. We resolve the transport DB-first in
    // `putFileServerSide`, so an admin can select S3 in /admin/storage while
    // NEXT_PUBLIC_UPLOAD_TRANSPORT is unset — that combination reached this
    // switch and threw. Object storage is only ever requested once a transport
    // of 's3' or 'azure-blob' has already been chosen, so S3 is the correct
    // default for everything that is not explicitly azure-blob.
    case 's3':
    default:
      cached = new S3Provider();
      return cached;
  }
};
