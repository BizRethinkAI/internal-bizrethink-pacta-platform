import { z } from 'zod';
import { PRODUCED_INSTRUMENTS } from '../../../publish/recipient-contract';

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
  /** Which saved entity issues it. ADR 0026: entity + type = one template. */
  entityId: z.string().min(1).max(80),
  instrument: z.enum(PRODUCED_INSTRUMENTS),
}).strict();
/**
 * A revision takes a fresh copy of the entity as it stands; there is nothing to
 * send but which revision you were looking at. The entity is edited on the
 * entity, which is the only way an edit ever reaches a document (ADR 0026 §4).
 */
export const ZUpdateMcaTemplateRequestSchema = ZListMcaTemplatesRequestSchema.extend({
  id: z.string().min(1).max(80),
  data: z.object({ expectedVersion: z.number().int().positive() }).strict(),
}).strict();
export const ZPreviewMcaTemplateRequestSchema = ZGetMcaTemplateRequestSchema.extend({
  version: z.number().int().positive(),
}).strict();
/**
 * Where to record the grant.
 *
 * `organisationId` absent means the admin's own account, which is not scoped
 * to anything — it turns the feature on for every team they belong to. Naming
 * one organisation writes the organisation scope instead, which is the only
 * way to choose between them. The route checks the admin belongs to it.
 */
export const ZSetMcaAccessRequestSchema = z
  .object({
    feature: z.enum(['mca-builder', 'mca-clause-draft-rendering']),
    enabled: z.boolean(),
    organisationId: z.string().min(1).max(80).optional(),
  })
  .strict();

/**
 * Publishing names one document of one revision.
 *
 * `PRODUCED_INSTRUMENTS` rather than the same five literals written out again:
 * the split funding letter is absent from it on purpose (ADR 0019), and a
 * second copy of that list is what drifts when a sixth document appears. The
 * create schema above already reads it.
 */
export const ZMcaPublicationRequestSchema = ZPreviewMcaTemplateRequestSchema.extend({
  instrument: z.enum(PRODUCED_INSTRUMENTS),
}).strict();

/**
 * A preview of the template those two choices WOULD produce, before it exists.
 *
 * No `id` and no `version`, unlike `ZPreviewMcaTemplateRequestSchema` — there
 * is nothing saved to name yet, which is the whole point of it.
 */
export const ZProspectiveMcaTemplateRequestSchema = ZListMcaTemplatesRequestSchema.extend({
  entityId: z.string().min(1).max(80),
  instrument: z.enum(PRODUCED_INSTRUMENTS),
}).strict();
