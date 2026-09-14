// MODIFIED for BizRethink (overlay 089): preserve the flattenForm contract in a bounded worker.
import { normalizeBoundedPdf } from '@bizrethink/customizations/server-only/resources/media-worker';

export const normalizePdf = (pdf: Buffer, options: { flattenForm?: boolean; timeoutMs?: number } = {}) =>
  normalizeBoundedPdf(pdf, options);
