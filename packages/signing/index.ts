import {
  NEXT_PRIVATE_SIGNING_TRANSPORT,
  NEXT_PRIVATE_USE_LEGACY_SIGNING_SUBFILTER,
  NEXT_PUBLIC_SIGNING_CONTACT_INFO,
  NEXT_PUBLIC_WEBAPP_URL,
} from '@documenso/lib/constants/app';
import type { PDF, Signer } from '@libpdf/core';
import { match } from 'ts-pattern';

import { getTimestampAuthority, resetTimestampAuthorities, seedTsaFromConfig } from './helpers/tsa';
import { createGoogleCloudSigner } from './transports/google-cloud';
import { createLocalSigner } from './transports/local';

export type SignOptions = {
  pdf: PDF;
};

let signer: Signer | null = null;

const getSigner = async () => {
  if (signer) {
    return signer;
  }

  // MODIFIED for BizRethink (overlay 011): transport selection consults the
  // singleton `BizrethinkInstanceSigningConfig` row first (so the admin UI
  // can flip transport without a redeploy), and falls back to env reads
  // when the row is absent. The cert/key payloads themselves are loaded
  // inside createLocalSigner / createGoogleCloudSigner — those functions
  // are independently patched to consult the DB row before env.
  const { getInstanceSigningConfig } = await import(
    '@bizrethink/customizations/server-only/instance-signing-config'
  );
  const dbConfig = await getInstanceSigningConfig();

  // Seed the TSA cache from DB before the first signPdf so the synchronous
  // `getTimestampAuthority()` read inside signPdf sees the DB-sourced URLs.
  if (dbConfig?.tsaUrls && dbConfig.tsaUrls.length > 0) {
    seedTsaFromConfig(dbConfig.tsaUrls);
  }

  // Env fallback goes through upstream's constant, which as of #3309 defaults an
  // unset transport to 'local' -- the same default this line used to spell out.
  const transport = dbConfig?.transport ?? NEXT_PRIVATE_SIGNING_TRANSPORT();

  // eslint-disable-next-line require-atomic-updates
  signer = await match(transport)
    .with('local', async () => await createLocalSigner())
    .with('gcloud-hsm', async () => await createGoogleCloudSigner())
    .otherwise(() => {
      throw new Error(`Unsupported signing transport: ${transport}`);
    });

  return signer;
};

// ADDED for BizRethink (overlay 011): expose a cache-bust hook so the admin
// TRPC mutation that writes the singleton row can force the next signPdf
// call to re-load the new cert + transport without a process restart.
// Resets BOTH the in-process Signer cache and the TSA cache.
export const resetSigningCaches = () => {
  signer = null;
  resetTimestampAuthorities();
};

export const signPdf = async ({ pdf }: SignOptions) => {
  const signer = await getSigner();

  const tsa = getTimestampAuthority();

  // MODIFIED for BizRethink (overlay 011): contact info reads from the DB
  // row first, falling back to the env helper. We DO want to await the DB
  // lookup here because the Contact Info field is embedded into every signed
  // PDF and changing it via admin UI shouldn't require a restart.
  const { getInstanceSigningConfig } = await import(
    '@bizrethink/customizations/server-only/instance-signing-config'
  );
  const dbConfig = await getInstanceSigningConfig();
  const contactInfo = dbConfig?.signingContactInfo || NEXT_PUBLIC_SIGNING_CONTACT_INFO();

  const { bytes } = await pdf.sign({
    signer,
    reason: 'Signed by Documenso',
    location: NEXT_PUBLIC_WEBAPP_URL(),
    contactInfo,
    subFilter: NEXT_PRIVATE_USE_LEGACY_SIGNING_SUBFILTER()
      ? 'adbe.pkcs7.detached'
      : 'ETSI.CAdES.detached',
    timestampAuthority: tsa ?? undefined,
    longTermValidation: !!tsa,
    archivalTimestamp: !!tsa,
    // A B-LTA signature (signer chain + RFC 3161 timestamp token + LTV
    // revocation data) can exceed the 12288-byte default placeholder,
    // depending on the signing certificate chain and the TSA responder.
    // The unused portion is zero-padding, so over-reserving is cheap.
    estimatedSize: tsa ? 32768 : undefined,
  });

  return bytes;
};
