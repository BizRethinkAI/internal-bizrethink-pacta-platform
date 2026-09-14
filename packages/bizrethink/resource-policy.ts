import { z } from 'zod';

export const ZResourcePolicy = z.object({
  trialDocuments: z.number().int().min(0).max(10_000),
  trialEmails: z.number().int().min(0).max(100_000),
  trialRecipients: z.number().int().min(1).max(1_000),
  trialOrganisations: z.number().int().min(1).max(100),
});
export const DEFAULT_RESOURCE_POLICY: z.infer<typeof ZResourcePolicy> = {
  trialDocuments: 5,
  trialEmails: 10,
  trialRecipients: 10,
  trialOrganisations: 1,
};
