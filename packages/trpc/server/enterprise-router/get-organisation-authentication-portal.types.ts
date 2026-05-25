import { OrganisationAuthenticationPortalSchema } from '@documenso/prisma/generated/zod/modelSchema/OrganisationAuthenticationPortalSchema';
import { z } from 'zod';

export const ZGetOrganisationAuthenticationPortalRequestSchema = z.object({
  organisationId: z.string(),
});

export const ZGetOrganisationAuthenticationPortalResponseSchema = OrganisationAuthenticationPortalSchema.pick({
  defaultOrganisationRole: true,
  enabled: true,
  clientId: true,
  wellKnownUrl: true,
  autoProvisionUsers: true,
  allowedDomains: true,
  // BizRethink (post-merge fix): include allowPersonalOrganisations so the
  // settings/sso.tsx page can read it. Upstream's get endpoint dropped this
  // field; we restore it here since our sso.tsx still surfaces the toggle.
  allowPersonalOrganisations: true,
}).extend({
  /**
   * Whether we have the client secret in the database.
   *
   * Do not expose the actual client secret.
   */
  clientSecretProvided: z.boolean(),
});

export type TGetOrganisationAuthenticationPortalResponse = z.infer<
  typeof ZGetOrganisationAuthenticationPortalResponseSchema
>;
