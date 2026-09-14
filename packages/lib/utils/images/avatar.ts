// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
// BizRethink overlay 089: finite bytes, pixels, concurrency and processing time.
import { processBoundedImage } from '@bizrethink/customizations/server-only/resources/media-worker';

export const optimiseAvatar = (bytes: string) => processBoundedImage('avatar', bytes);
export const loadAvatar = async (bytes: string) => ({
  contentType: 'image/jpeg',
  content: await processBoundedImage('avatar-load', bytes),
});
