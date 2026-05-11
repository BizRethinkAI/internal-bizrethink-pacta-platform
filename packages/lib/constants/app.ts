import { env } from '@documenso/lib/utils/env';

export const APP_DOCUMENT_UPLOAD_SIZE_LIMIT =
  Number(env('NEXT_PUBLIC_DOCUMENT_SIZE_UPLOAD_LIMIT')) || 50;

export const NEXT_PUBLIC_WEBAPP_URL = () =>
  env('NEXT_PUBLIC_WEBAPP_URL') ?? 'http://localhost:3000';

export const NEXT_PUBLIC_SIGNING_CONTACT_INFO = () =>
  env('NEXT_PUBLIC_SIGNING_CONTACT_INFO') ?? NEXT_PUBLIC_WEBAPP_URL();

export const NEXT_PRIVATE_USE_LEGACY_SIGNING_SUBFILTER = () =>
  env('NEXT_PRIVATE_USE_LEGACY_SIGNING_SUBFILTER') === 'true';

export const NEXT_PRIVATE_INTERNAL_WEBAPP_URL = () =>
  env('NEXT_PRIVATE_INTERNAL_WEBAPP_URL') ?? NEXT_PUBLIC_WEBAPP_URL();

export const IS_BILLING_ENABLED = () => env('NEXT_PUBLIC_FEATURE_BILLING_ENABLED') === 'true';

// MODIFIED for BizRethink (overlay 045c): async variant that reads from
// the DB-backed BizrethinkInstanceStripeConfig singleton with env-var
// fallback. New code paths (webhook handler, billing-gated TRPC routes,
// admin UI gates) prefer this over the sync IS_BILLING_ENABLED() so
// admins can toggle billing via the admin UI without a redeploy.
//
// The sync IS_BILLING_ENABLED() is kept for backward compat with 25+
// existing call sites that can't easily go async (component renders,
// loader gates, etc.). Those still read the env var; migrating them to
// the DB-aware variant happens gradually as we touch each one.
export const isBillingEnabledFromConfig = async (): Promise<boolean> => {
  // Dynamic import to avoid a hot import cycle:
  // app.ts → instance-stripe-config → prisma → (lots of other lib code).
  // Lazy resolution keeps this constants file lightweight.
  const { isBillingEnabled } =
    await import('@bizrethink/customizations/server-only/instance-stripe-config');
  return isBillingEnabled();
};

export const API_V2_BETA_URL = '/api/v2-beta';
export const API_V2_URL = '/api/v2';

// MODIFIED for BizRethink overlay 021: rebrand support email default.
// Operators can still override via NEXT_PUBLIC_SUPPORT_EMAIL env var.
export const SUPPORT_EMAIL = env('NEXT_PUBLIC_SUPPORT_EMAIL') ?? 'support@bizrethink.ai';

// Added for BizRethink overlay 021: canonical product name used in meta tags,
// page titles, and email copy. Pacta is the BizRethink AI document signing
// platform.
export const APP_NAME = 'Pacta';
export const APP_PARENT_BRAND = 'BizRethink AI';
export const APP_FULL_NAME = `${APP_NAME} by ${APP_PARENT_BRAND}`;

export const USE_INTERNAL_URL_BROWSERLESS = () =>
  env('NEXT_PUBLIC_USE_INTERNAL_URL_BROWSERLESS') === 'true';

export const IS_AI_FEATURES_CONFIGURED = () =>
  !!env('GOOGLE_VERTEX_PROJECT_ID') && !!env('GOOGLE_VERTEX_API_KEY');

/**
 * Temporary flag to toggle between Playwright-based and Konva-based PDF generation
 * for audit logs during sealing.
 *
 * @deprecated This is a temporary flag and will be removed once Konva-based generation is stable.
 */
export const NEXT_PRIVATE_USE_PLAYWRIGHT_PDF = () =>
  env('NEXT_PRIVATE_USE_PLAYWRIGHT_PDF') === 'true';

export const NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY = () =>
  env('NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY');
