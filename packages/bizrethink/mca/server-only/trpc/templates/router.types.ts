import { z } from 'zod';
import { PRODUCED_INSTRUMENTS } from '../../../publish/recipient-contract';
import { ZMcaProviderProfile } from '../../../templates/profile';

export const ZListMcaTemplatesRequestSchema = z.object({ teamId: z.number().int().positive() }).strict();
export const ZGetMcaTemplateRequestSchema = ZListMcaTemplatesRequestSchema.extend({
  id: z.string().min(1).max(80),
  version: z.number().int().positive().optional(),
}).strict();
/*
  WHICH DOCUMENT THIS TEMPLATE IS, chosen when it is created and never after.

  ADR 0026: entity + type = one template. `PRODUCED_INSTRUMENTS` and not
  `MCA_INSTRUMENTS`, so the split funding letter is refused at the edge by the
  schema rather than reaching the compiler — it is the processor's, used
  exactly as supplied (ADR 0019), and the builder produces none.
*/
export const ZCreateMcaTemplateRequestSchema = ZListMcaTemplatesRequestSchema.extend({
  data: ZMcaProviderProfile,
  instrument: z.enum(PRODUCED_INSTRUMENTS),
}).strict();
export const ZUpdateMcaTemplateRequestSchema = ZListMcaTemplatesRequestSchema.extend({
  id: z.string().min(1).max(80),
  data: z.object({ expectedVersion: z.number().int().positive(), profile: ZMcaProviderProfile }).strict(),
}).strict();
export const ZPreviewMcaTemplateRequestSchema = ZGetMcaTemplateRequestSchema.extend({
  version: z.number().int().positive(),
}).strict();
export const ZSetMcaAccessRequestSchema = z
  .object({ feature: z.enum(['mca-builder', 'mca-clause-draft-rendering']), enabled: z.boolean() })
  .strict();
