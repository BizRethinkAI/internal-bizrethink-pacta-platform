// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
import { createVertex } from '@ai-sdk/google-vertex';
import { boundedAiFetch } from '@bizrethink/customizations/server-only/resources/ai-fetch';

import { env } from '../../utils/env';

export const vertex = createVertex({
  fetch: boundedAiFetch,
  project: env('GOOGLE_VERTEX_PROJECT_ID'),
  location: env('GOOGLE_VERTEX_LOCATION') || 'global',
  apiKey: env('GOOGLE_VERTEX_API_KEY'),
});
