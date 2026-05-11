import { OrganisationMemberInviteStatus } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@documenso/prisma';
import { procedure, router } from '@documenso/trpc/server/trpc';

// Phase L (2026-05-11): public lookup for pending invites at the signup form.
//
// The signup page debounces the email input and calls this to render a
// "You'll join: <orgName> as <role>" preview before the user submits. Two
// goals:
//   - Reassure the user they're landing in the right org (not a blank
//     Personal Org).
//   - Lightly nudge users who DON'T have an invite — if the instance is in
//     require-invite-when-domain-gated mode, the form can show "We don't
//     see an invitation for this email — ask your admin to invite you first."
//
// Security: returns the org NAME (which is admin-controlled, not user PII)
// and the role from the invite. Does NOT return the invite token, inviter
// identity, or anything else that could be used to bypass the
// accept-invite flow. The accept itself still goes through
// addUserToOrganisation in the auto-claim helper.
//
// Rate-limiting: this is a PUBLIC procedure (no auth required) so it MUST
// be rate-limited at the network layer. The upstream signup rate-limit
// (signupRateLimit) covers the form submit; the preview lookup needs its
// own bucket if abused. Since the response is "org name only" the
// information leak is minimal — same as enumerating "is org X open for
// signup" via the admin's invite-link URLs. Acceptable for v1.

const ZLookupInput = z.object({
  email: z.string().email().toLowerCase(),
});

const ZLookupOutput = z.object({
  pendingInvites: z.array(
    z.object({
      organisationName: z.string(),
      organisationRole: z.enum(['ADMIN', 'MANAGER', 'MEMBER']),
    }),
  ),
});

export const signupInviteRouter = router({
  lookup: procedure
    .input(ZLookupInput)
    .output(ZLookupOutput)
    .query(async ({ input }) => {
      const invites = await prisma.organisationMemberInvite.findMany({
        where: {
          email: { equals: input.email, mode: 'insensitive' },
          status: OrganisationMemberInviteStatus.PENDING,
        },
        select: {
          organisationRole: true,
          organisation: { select: { name: true } },
        },
      });

      return {
        pendingInvites: invites.map((i) => ({
          organisationName: i.organisation.name,
          organisationRole: i.organisationRole,
        })),
      };
    }),
});
