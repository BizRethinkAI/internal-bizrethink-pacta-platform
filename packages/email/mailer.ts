import { env } from '@documenso/lib/utils/env';
import { ResendTransport } from '@documenso/nodemailer-resend';
import type { Transporter } from 'nodemailer';
import { createTransport } from 'nodemailer';

import { MailChannelsTransport } from './transports/mailchannels';

/**
 * Creates a Nodemailer transport object for sending emails.
 *
 * This function uses various environment variables to configure the appropriate
 * email transport mechanism. It supports multiple types of email transports,
 * including MailChannels, Resend, and different SMTP configurations.
 *
 * @returns {Transporter} A configured Nodemailer transporter instance.
 *
 * Supported Transports:
 * - **mailchannels**: Uses MailChannelsTransport, requiring:
 *   - `NEXT_PRIVATE_MAILCHANNELS_API_KEY`: API key for MailChannels
 *   - `NEXT_PRIVATE_MAILCHANNELS_ENDPOINT`: Endpoint for MailChannels (optional)
 * - **resend**: Uses ResendTransport, requiring:
 *   - `NEXT_PRIVATE_RESEND_API_KEY`: API key for Resend
 * - **smtp-api**: Uses a custom SMTP API configuration, requiring:
 *   - `NEXT_PRIVATE_SMTP_HOST`: The SMTP server host
 *   - `NEXT_PRIVATE_SMTP_APIKEY`: The API key for SMTP authentication
 *   - `NEXT_PRIVATE_SMTP_APIKEY_USER`: The username for SMTP authentication (default: 'apikey')
 * - **smtp-auth** (default): Uses a standard SMTP configuration, requiring:
 *   - `NEXT_PRIVATE_SMTP_HOST`: The SMTP server host (default: 'localhost:2500')
 *   - `NEXT_PRIVATE_SMTP_PORT`: The port to connect to (default: 587)
 *   - `NEXT_PRIVATE_SMTP_SECURE`: Whether to use SSL/TLS (default: false)
 *   - `NEXT_PRIVATE_SMTP_UNSAFE_IGNORE_TLS`: Whether to ignore TLS (default: false)
 *   - `NEXT_PRIVATE_SMTP_USERNAME`: The username for SMTP authentication
 *   - `NEXT_PRIVATE_SMTP_PASSWORD`: The password for SMTP authentication
 *   - `NEXT_PRIVATE_SMTP_SERVICE`: The SMTP service provider (e.g., "gmail"). This option is used
 *     when integrating with well-known services (like Gmail), enabling simplified configuration.
 *
 * Example Usage:
 * ```env
 * NEXT_PRIVATE_SMTP_TRANSPORT='smtp-auth';
 * NEXT_PRIVATE_SMTP_HOST='smtp.example.com';
 * NEXT_PRIVATE_SMTP_PORT=587;
 * NEXT_PRIVATE_SMTP_SERVICE='gmail';
 * NEXT_PRIVATE_SMTP_SECURE='true';
 * NEXT_PRIVATE_SMTP_USERNAME='your-email@gmail.com';
 * NEXT_PRIVATE_SMTP_PASSWORD='your-password';
 * ```
 *
 * Notes:
 * - Ensure that the required environment variables for each transport type are set.
 * - If `NEXT_PRIVATE_SMTP_TRANSPORT` is not specified, the default is `smtp-auth`.
 * - `NEXT_PRIVATE_SMTP_SERVICE` is optional and used specifically for well-known services like Gmail.
 */
const getTransport = (): Transporter => {
  const transport = env('NEXT_PRIVATE_SMTP_TRANSPORT') ?? 'smtp-auth';

  if (transport === 'mailchannels') {
    return createTransport(
      MailChannelsTransport.makeTransport({
        apiKey: env('NEXT_PRIVATE_MAILCHANNELS_API_KEY'),
        endpoint: env('NEXT_PRIVATE_MAILCHANNELS_ENDPOINT'),
      }),
    );
  }

  if (transport === 'resend') {
    if (!env('NEXT_PRIVATE_RESEND_API_KEY')) {
      throw new Error('Resend transport requires NEXT_PRIVATE_RESEND_API_KEY');
    }

    return createTransport(
      ResendTransport.makeTransport({
        apiKey: env('NEXT_PRIVATE_RESEND_API_KEY'),
      }),
    );
  }

  if (transport === 'smtp-api') {
    if (!env('NEXT_PRIVATE_SMTP_HOST') || !env('NEXT_PRIVATE_SMTP_APIKEY')) {
      throw new Error('SMTP API transport requires NEXT_PRIVATE_SMTP_HOST and NEXT_PRIVATE_SMTP_APIKEY');
    }

    return createTransport({
      host: env('NEXT_PRIVATE_SMTP_HOST'),
      port: Number(env('NEXT_PRIVATE_SMTP_PORT')) || 587,
      secure: env('NEXT_PRIVATE_SMTP_SECURE') === 'true',
      auth: {
        user: env('NEXT_PRIVATE_SMTP_APIKEY_USER') ?? 'apikey',
        pass: env('NEXT_PRIVATE_SMTP_APIKEY') ?? '',
      },
    });
  }

  return createTransport({
    host: env('NEXT_PRIVATE_SMTP_HOST') ?? '127.0.0.1:2500',
    port: Number(env('NEXT_PRIVATE_SMTP_PORT')) || 587,
    secure: env('NEXT_PRIVATE_SMTP_SECURE') === 'true',
    ignoreTLS: env('NEXT_PRIVATE_SMTP_UNSAFE_IGNORE_TLS') === 'true',
    auth: env('NEXT_PRIVATE_SMTP_USERNAME')
      ? {
          user: env('NEXT_PRIVATE_SMTP_USERNAME'),
          pass: env('NEXT_PRIVATE_SMTP_PASSWORD') ?? '',
        }
      : undefined,
    ...(env('NEXT_PRIVATE_SMTP_SERVICE') ? { service: env('NEXT_PRIVATE_SMTP_SERVICE') } : {}),
  });
};

// MODIFIED for BizRethink (overlay 010 v2): per-org SMTP via explicit orgId
// argument. The original ALS-Proxy approach (overlay 010 v1, 2026-04-30)
// failed because `enterWith` doesn't propagate UP the async stack — when
// getEmailContext called enterWith and returned, the awaiting handler's
// continuation ran in its own async-context tree and saw an empty store.
// Live diagnostic logs at 2026-05-01 02:04 UTC confirmed: storeAfter inside
// getEmailContext was set, but pre-runTask in the handler was undefined
// despite the singleton verification (alsId 'mxggrn', hasGlobal: true).
//
// New design: `mailer` is an eager env-default singleton (unchanged from
// upstream). Callers that want per-org routing import `getMailer(orgId)`
// instead, which returns the org-specific transporter or falls back. This
// is bulletproof against future merges adding new mailer.sendMail call
// sites — TS will compile fine without orgId, just dispatching to env-default.

export const mailer: Transporter = getTransport();

/**
 * Resolve the right transporter for an organisation. Falls back to the
 * env-default mailer if no per-org SMTP row exists for this orgId, or if
 * orgId is undefined/null.
 *
 * Use at every mailer.sendMail call site that has access to an orgId.
 * Other call sites (auth, team-internal) keep using `mailer` directly —
 * those flows are BizRethink-attributed by design.
 */
export const getMailer = async (orgId?: string | null): Promise<Transporter> => {
  if (!orgId) {
    return mailer;
  }
  const { getMailerForOrg } = await import('@bizrethink/customizations/server-only/per-org-mailer');
  return getMailerForOrg(orgId);
};
