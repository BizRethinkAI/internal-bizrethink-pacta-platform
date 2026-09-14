// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
import { EmailDomainSchema } from '@documenso/prisma/generated/zod/modelSchema/EmailDomainSchema';
import { z } from 'zod';

import { ZOrganisationEmailLiteSchema } from './organisation-email';

/**
 * The full email domain response schema.
 *
 * Mainly used for returning a single email domain from the API.
 */
export const ZEmailDomainSchema = EmailDomainSchema.pick({
  id: true,
  status: true,
  organisationId: true,
  domain: true,
  selector: true,
  publicKey: true,
  createdAt: true,
  updatedAt: true,
  lastVerifiedAt: true,
}).extend({
  emails: ZOrganisationEmailLiteSchema.array(),
  expiresAt: z.date().nullable().optional(),
});

export type TEmailDomain = z.infer<typeof ZEmailDomainSchema>;

/**
 * A version of the email domain response schema when returning multiple email domains at once from a single API endpoint.
 */
export const ZEmailDomainManySchema = EmailDomainSchema.pick({
  id: true,
  status: true,
  organisationId: true,
  domain: true,
  selector: true,
  createdAt: true,
  updatedAt: true,
  lastVerifiedAt: true,
}).extend({ expiresAt: z.date().nullable().optional() });

export type TEmailDomainMany = z.infer<typeof ZEmailDomainManySchema>;
