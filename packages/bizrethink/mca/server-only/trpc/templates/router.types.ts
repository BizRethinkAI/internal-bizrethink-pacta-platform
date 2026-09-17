import { z } from 'zod';
import { ZMcaProviderProfile } from '../../../templates/profile';
import { ZMcaDraftInput } from '../../../transactions/input';

export const ZListMcaTemplatesRequestSchema = z.object({ teamId: z.number().int().positive() }).strict();
export const ZGetMcaTemplateRequestSchema = ZListMcaTemplatesRequestSchema.extend({
  id: z.string().min(1).max(80),
  version: z.number().int().positive().optional(),
}).strict();
export const ZCreateMcaTemplateRequestSchema = ZListMcaTemplatesRequestSchema.extend({
  data: ZMcaProviderProfile,
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

export const ZSaveMcaDealRequestSchema = ZListMcaTemplatesRequestSchema.extend({
  id: z.string().min(1).max(80).optional(),
  expectedVersion: z.number().int().positive().optional(),
  templateId: z.string().min(1).max(80),
  label: z.string().trim().min(1).max(200),
  input: ZMcaDraftInput,
}).strict();
export const ZOpenMcaDealRequestSchema = ZListMcaTemplatesRequestSchema.extend({
  id: z.string().min(1).max(80),
}).strict();
export const ZDeleteMcaDealRequestSchema = ZOpenMcaDealRequestSchema;

export const ZFillMcaDraftRequestSchema = ZPreviewMcaTemplateRequestSchema.extend({ draft: ZMcaDraftInput }).strict();
