import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import slugify from '@sindresorhus/slugify';

import { ONE_HOUR, ONE_SECOND } from '../../../constants/time';
import { alphaid } from '../../id';
import type { ResolvedStorageSettings } from './resolve-storage-settings';
import { resolveStorageSettings } from './resolve-storage-settings';
import type { PresignedUrl, StorageProvider, UploadFileInput, UploadFileResult } from './storage-provider';

// MODIFIED for BizRethink (overlay 013, re-homed 2026-08-13): every setting is
// resolved from the DB-backed instance storage config (admin UI) with env
// fallback. Upstream built the S3Client eagerly in the constructor from env;
// because the DB read is async, the client is now built lazily on first use and
// cached. Admin changes take effect on the next process/worker start, matching
// the previous overlay-013 behaviour.
export class S3Provider implements StorageProvider {
  private clientPromise: Promise<{ client: S3Client; settings: ResolvedStorageSettings }> | undefined;

  private async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const settings = await resolveStorageSettings();

        const hasCredentials = settings.accessKeyId && settings.secretAccessKey;

        const client = new S3Client({
          endpoint: settings.endpoint || undefined,
          forcePathStyle: settings.forcePathStyle,
          region: settings.region,
          // Since v3.729 the AWS SDK adds a CRC32 checksum to every request by default
          // (`requestChecksumCalculation: 'WHEN_SUPPORTED'`). Many S3-compatible providers
          // (GarageHQ, MinIO, Backblaze B2, etc.) reject those requests with an
          // `InvalidDigest` error, which breaks uploads against third-party storage. Only
          // send/validate checksums when the operation actually requires them so the default
          // configuration keeps working with non-AWS backends.
          requestChecksumCalculation: 'WHEN_REQUIRED',
          responseChecksumValidation: 'WHEN_REQUIRED',
          credentials: hasCredentials
            ? {
                accessKeyId: String(settings.accessKeyId),
                secretAccessKey: String(settings.secretAccessKey),
              }
            : undefined,
        });

        return { client, settings };
      })();
    }

    return this.clientPromise;
  }

  async getPresignPostUrl(fileName: string, contentType: string, userId?: number): Promise<PresignedUrl> {
    const { client, settings } = await this.getClient();

    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const { name, ext } = path.parse(fileName);

    let slugified = slugify(name);
    if (slugified.length === 0 || slugified.length > 100) {
      slugified = alphaid(8);
    }

    let key = `${alphaid(12)}/${slugified}${ext}`;
    if (userId) {
      key = `${userId}/${key}`;
    }

    const command = new PutObjectCommand({
      Bucket: settings.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(client, command, { expiresIn: ONE_HOUR / ONE_SECOND });
    return { key, url };
  }

  async getAbsolutePresignPostUrl(key: string): Promise<PresignedUrl> {
    const { client, settings } = await this.getClient();

    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const command = new PutObjectCommand({
      Bucket: settings.bucket,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn: ONE_HOUR / ONE_SECOND });
    return { key, url };
  }

  async getPresignGetUrl(key: string): Promise<PresignedUrl> {
    const { client, settings } = await this.getClient();

    if (settings.distributionDomain) {
      const distributionUrl = new URL(key, settings.distributionDomain);

      const { getSignedUrl: getCloudfrontSignedUrl } = await import('@aws-sdk/cloudfront-signer');

      const url = getCloudfrontSignedUrl({
        url: distributionUrl.toString(),
        keyPairId: `${settings.distributionKeyId}`,
        privateKey: `${settings.distributionKeyPem}`,
        dateLessThan: new Date(Date.now() + ONE_HOUR).toISOString(),
      });

      return { key, url };
    }

    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const command = new GetObjectCommand({
      Bucket: settings.bucket,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn: ONE_HOUR / ONE_SECOND });
    return { key, url };
  }

  async uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
    const { client, settings } = await this.getClient();

    const { name, ext } = path.parse(input.name);

    const key = `${alphaid(12)}/${slugify(name)}${ext}`;

    const body = input.body instanceof ArrayBuffer ? Buffer.from(input.body) : input.body;

    await client.send(
      new PutObjectCommand({
        Bucket: settings.bucket,
        Key: key,
        Body: body,
        ContentType: input.type,
      }),
    );

    return { key };
  }

  async deleteFile(key: string): Promise<void> {
    const { client, settings } = await this.getClient();

    await client.send(
      new DeleteObjectCommand({
        Bucket: settings.bucket,
        Key: key,
      }),
    );
  }
}
