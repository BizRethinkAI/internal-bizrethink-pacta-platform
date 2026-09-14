// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
// BizRethink overlay 089: bound both newly supplied and legacy stored images.
import { processBoundedImage } from '@bizrethink/customizations/server-only/resources/media-worker';

export const loadLogo = async (file: Uint8Array) => ({
  contentType: 'image/png',
  content: await processBoundedImage('logo-load', file),
});
export const optimiseBrandingLogo = (input: Buffer | Uint8Array): Promise<Buffer> => processBoundedImage('logo', input);
