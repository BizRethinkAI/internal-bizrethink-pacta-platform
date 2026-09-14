// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
export { renderBoundedPdf as pdfToImages } from '@bizrethink/customizations/server-only/resources/media-worker';
export type PdfToImagesOptions = { scale?: number; maxPages?: number };
