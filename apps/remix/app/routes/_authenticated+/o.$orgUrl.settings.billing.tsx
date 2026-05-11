import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { SubscriptionStatus } from '@prisma/client';
import { AlertTriangle, Loader, ShieldCheck, Sparkles } from 'lucide-react';
import type Stripe from 'stripe';
import { P, match } from 'ts-pattern';

import { useCurrentOrganisation } from '@documenso/lib/client-only/providers/organisation';
import { canExecuteOrganisationAction } from '@documenso/lib/utils/organisations';
import { trpc } from '@documenso/trpc/react';

import { BillingPlans } from '~/components/general/billing-plans';
import { OrganisationBillingPortalButton } from '~/components/general/organisations/organisation-billing-portal-button';
import { OrganisationBillingInvoicesTable } from '~/components/tables/organisation-billing-invoices-table';
import { appMetaTags } from '~/utils/meta';

// BizRethink (overlay 044): trial / internal banner. Renders above the
// upstream billing UI. Reads from bizrethink.organisationBilling.get.
function PactaBillingBanner({ organisationId }: { organisationId: string }) {
  const { data, isLoading } = trpc.bizrethink.organisationBilling.get.useQuery({
    organisationId,
  });

  if (isLoading || !data) {
    return null;
  }

  if (data.bizrethinkInternal) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100">
        <ShieldCheck className="h-4 w-4 flex-shrink-0" />
        <p>
          <Trans>
            <span className="font-semibold">BizRethink Internal.</span> This organisation is
            operated directly by BizRethink AI and is not subject to standard SaaS billing.
          </Trans>
        </p>
      </div>
    );
  }

  // Phase L follow-up (2026-05-11): once the org has an active Stripe
  // subscription, the trial concept is moot — upstream's billing page
  // already shows "subscribed to Pacta Pro · renews on …". Hide the trial
  // banner to avoid contradicting that.
  if (data.hasActiveSubscription) {
    return null;
  }

  if (!data.trialEndsAt) {
    return null;
  }

  const now = Date.now();
  const trialEndsAtMs = new Date(data.trialEndsAt).getTime();
  const daysRemaining = Math.ceil((trialEndsAtMs - now) / (1000 * 60 * 60 * 24));

  if (trialEndsAtMs <= now) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <p>
          <Trans>
            <span className="font-semibold">Your Pro trial has ended.</span> Upgrade below to keep
            Pro features, or your organisation will be downgraded to the Free plan.
          </Trans>
        </p>
      </div>
    );
  }

  const urgent = daysRemaining <= 3;
  const colorClasses = urgent
    ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100'
    : 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-100';

  return (
    <div
      className={`mb-4 flex items-center gap-3 rounded-md border px-4 py-3 text-sm ${colorClasses}`}
    >
      <Sparkles className="h-4 w-4 flex-shrink-0" />
      <p>
        <Trans>
          <span className="font-semibold">Pro trial active</span> — {daysRemaining}{' '}
          {daysRemaining === 1 ? 'day' : 'days'} remaining. Add a payment method below to keep Pro
          features after the trial ends.
        </Trans>
      </p>
    </div>
  );
}

export function meta() {
  return appMetaTags(msg`Billing`);
}

export default function TeamsSettingBillingPage() {
  const { _, i18n } = useLingui();

  const organisation = useCurrentOrganisation();

  const { data: subscriptionQuery, isLoading: isLoadingSubscription } =
    trpc.enterprise.billing.subscription.get.useQuery({
      organisationId: organisation.id,
    });

  if (isLoadingSubscription || !subscriptionQuery) {
    return (
      <div className="flex items-center justify-center rounded-lg py-32">
        <Loader className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const { subscription, plans } = subscriptionQuery;

  const canManageBilling = canExecuteOrganisationAction(
    'MANAGE_BILLING',
    organisation.currentOrganisationRole,
  );

  const { organisationSubscription, stripeSubscription } = subscription || {};

  const currentProductName =
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    (stripeSubscription?.items.data[0].price.product as Stripe.Product | undefined)?.name;

  return (
    <div>
      {/* BizRethink (overlay 044): trial / internal banner */}
      <PactaBillingBanner organisationId={organisation.id} />

      <div className="flex flex-row items-end justify-between">
        <div>
          <h3 className="text-2xl font-semibold">
            <Trans>Billing</Trans>
          </h3>

          <div className="text-muted-foreground mt-2 text-sm">
            {!organisationSubscription && (
              <p>
                <Trans>
                  You are currently on the <span className="font-semibold">Free Plan</span>.
                </Trans>
              </p>
            )}

            {organisationSubscription &&
              match(organisationSubscription.status)
                .with('ACTIVE', () => (
                  <p>
                    {match(organisationSubscription)
                      .with(
                        { cancelAtPeriodEnd: true, periodEnd: P.nonNullable },
                        ({ periodEnd }) =>
                          currentProductName ? (
                            <Trans>
                              You are currently subscribed to{' '}
                              <span className="font-semibold">{currentProductName}</span> which is
                              set to end on{' '}
                              <span className="font-semibold">{i18n.date(periodEnd)}</span>.
                            </Trans>
                          ) : (
                            <Trans>
                              You currently have an active plan which is set to end on{' '}
                              <span className="font-semibold">{i18n.date(periodEnd)}</span>.
                            </Trans>
                          ),
                      )
                      .with(
                        { cancelAtPeriodEnd: false, periodEnd: P.nonNullable },
                        ({ periodEnd }) =>
                          currentProductName ? (
                            <Trans>
                              You are currently subscribed to{' '}
                              <span className="font-semibold">{currentProductName}</span> which is
                              set to automatically renew on{' '}
                              <span className="font-semibold">{i18n.date(periodEnd)}</span>.
                            </Trans>
                          ) : (
                            <Trans>
                              You currently have an active plan which is set to automatically renew
                              on <span className="font-semibold">{i18n.date(periodEnd)}</span>.
                            </Trans>
                          ),
                      )
                      .otherwise(() =>
                        currentProductName ? (
                          <Trans>
                            You are currently subscribed to{' '}
                            <span className="font-semibold">{currentProductName}</span>.
                          </Trans>
                        ) : (
                          <Trans>You currently have an active plan.</Trans>
                        ),
                      )}
                  </p>
                ))
                .with('INACTIVE', () => (
                  <p>
                    {currentProductName ? (
                      <Trans>
                        You currently have an inactive{' '}
                        <span className="font-semibold">{currentProductName}</span> subscription.
                      </Trans>
                    ) : (
                      <Trans>Your current plan is inactive.</Trans>
                    )}
                  </p>
                ))
                .with('PAST_DUE', () => (
                  <p>
                    {currentProductName ? (
                      <Trans>
                        Your current {currentProductName} plan is past due. Please update your
                        payment information.
                      </Trans>
                    ) : (
                      <Trans>Your current plan is past due.</Trans>
                    )}
                  </p>
                ))
                .otherwise(() => null)}
          </div>
        </div>

        <OrganisationBillingPortalButton />
      </div>

      <hr className="my-4" />

      {(!subscription ||
        subscription.organisationSubscription.status === SubscriptionStatus.INACTIVE) &&
        canManageBilling && <BillingPlans plans={plans} />}

      <section className="mt-6">
        <OrganisationBillingInvoicesTable
          organisationId={organisation.id}
          subscriptionExists={Boolean(subscription)}
        />
      </section>
    </div>
  );
}
