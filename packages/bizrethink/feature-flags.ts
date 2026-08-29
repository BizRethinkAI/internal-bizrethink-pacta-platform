// BizRethink-specific feature switchboard.
//
// Use this single file to enable/disable BizRethink customizations at
// build time or via env var. Keeps overlay patches minimal — most
// can just check a flag here instead of hard-coding behavior.

export const BIZRETHINK_FLAGS = {
  /** Override Documenso's default mailer with the Postmark adapter. */
  USE_POSTMARK_MAILER: process.env['BIZRETHINK_USE_POSTMARK_MAILER'] === 'true',

  /** Apply per-DBA signing themes (Circular Payments, Circular Pay, etc.). */
  USE_PER_TENANT_THEMES: process.env['BIZRETHINK_USE_PER_TENANT_THEMES'] === 'true',

  /** Emit BizRethink-specific audit events alongside Documenso's standard ones. */
  EMIT_FINTECH_AUDIT: process.env['BIZRETHINK_EMIT_FINTECH_AUDIT'] === 'true',

  /** Forward Documenso webhooks to BizRethink internal event bus. */
  FANOUT_WEBHOOKS: process.env['BIZRETHINK_FANOUT_WEBHOOKS'] === 'true',
} as const;

export type BizRethinkFlags = typeof BIZRETHINK_FLAGS;
