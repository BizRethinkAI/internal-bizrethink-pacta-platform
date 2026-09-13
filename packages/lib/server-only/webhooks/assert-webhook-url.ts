// MODIFIED for BizRethink (overlay 083): fail-closed destination validation is
// owned by BizRethink. Delivery also pins the checked address at connection time.
export { assertSafeWebhookUrl as assertNotPrivateUrl } from '@bizrethink/customizations/server-only/outbound/webhook';
