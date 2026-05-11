import { router } from '@documenso/trpc/server/trpc';

import { instanceAiRouter } from './instance-ai-router';
import { instanceSigningRouter } from './instance-signing-router';
import { instanceStorageRouter } from './instance-storage-router';
import { instanceStripeRouter } from './instance-stripe-router';
import { orgSmtpRouter } from './org-smtp-router';
import { organisationBillingRouter } from './organisation-billing-router';
import { signupInviteRouter } from './signup-invite-router';
import { ssoProviderRouter } from './sso-provider-router';

// Top-level BizRethink TRPC router. Wired into the main `appRouter` via
// overlay 010 (modifies `packages/trpc/server/router.ts` to add a
// `bizrethink: bizrethinkRouter` namespace).
//
// Convention: every namespace under `bizrethink.*` is an additive feature
// from this package — none of them touch upstream Documenso routes.
//
// Phase B added `organisationSmtp` (per-org SMTP credentials).
// Phase C adds `instanceSigning` (instance-wide cert + TSA + contact info).

export const bizrethinkRouter = router({
  organisationSmtp: orgSmtpRouter,
  instanceSigning: instanceSigningRouter,
  instanceStorage: instanceStorageRouter,
  ssoProvider: ssoProviderRouter,
  instanceAi: instanceAiRouter,
  // Phase J (SaaS billing) — adds `bizrethink.organisationBilling.get`
  // returning trial state + internal flag for an org. Consumed by the
  // trial-banner component on the in-app billing page.
  organisationBilling: organisationBillingRouter,
  // Phase K (Stripe-via-UI) — DB-backed Stripe credentials + mode switch
  // + product sync. Replaces three env vars (STRIPE_API_KEY,
  // STRIPE_WEBHOOK_SECRET, FEATURE_BILLING_ENABLED) with admin-UI config.
  instanceStripe: instanceStripeRouter,
  // Phase L (auto-claim-invites) — public procedure for the signup form
  // to preview which org(s) the entered email will land in once they
  // complete signup. Pairs with overlay 048 (auto-claim on signup) +
  // overlay 048b (require-invite-when-gated check).
  signupInvite: signupInviteRouter,
});
