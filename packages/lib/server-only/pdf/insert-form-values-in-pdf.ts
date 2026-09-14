// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
// BizRethink overlay 089: form filling runs within the same PDF worker limits.
export { fillBoundedPdfForm as insertFormValuesInPdf } from '@bizrethink/customizations/server-only/resources/media-worker';
export type InsertFormValuesInPdfOptions = { pdf: Buffer; formValues: Record<string, string | boolean | number> };
