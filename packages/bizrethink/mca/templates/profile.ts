import { z } from 'zod';

import type { McaFacts } from '../clauses/facts';
import { MCA_JURISDICTIONS, type McaJurisdiction } from '../jurisdictions';
import { email, line, type McaFee, ZMcaFee } from '../plain-values';

const ZEntity = z
  .object({
    legalName: line(),
    entityType: line(100),
    organizationState: line(100),
    address: line(600),
    noticeEmail: email,
    noticeAddress: line(600),
  })
  .strict();

/** Answers only about the provider. Transaction facts belong to the fill contract. */

/** Re-exported: the fee schema moved to `plain-values` when the entity took the schedule (ADR 0026). */
export { type McaFee, ZMcaFee };

export const ZMcaProviderProfile = z
  .object({
    label: line(120),
    buyer: ZEntity.extend({
      reconciliationEmail: email,
      reconciliationAddress: line(600),
      servicingPhone: z.union([z.literal(''), line(80)]).optional(),
      // Where this funder litigates, asked only because a funder-state venue
      // needs it. Owner's decision, 2026-09-16: an explicit forum, not the state
      // of organisation, because a funder organised in Delaware litigates where
      // it works. The county is optional; a funder that names only a state gets
      // a state-wide forum.
      venueState: z.union([z.literal(''), line(100)]).optional(),
      venueCounty: z.union([z.literal(''), line(100)]).optional(),
      // Printed on the cover and in the page footer, as the funder's own
      // documents carry it. Optional: an older saved revision has none and
      // renders with the line absent rather than a placeholder.
      website: z.union([z.literal(''), line(120)]).optional(),
    }).strict(),
    policy: z
      .object({
        collectionMethod: z.literal('split-only'),
        settlementBase: z.literal('net'),
        venueRule: z.enum(['merchant-state', 'funder-state']),
        // An express provider answer; the draft's example profile is not evidence.
        supportedTermsConfirmed: z.boolean().refine(Boolean, 'Confirm that these are your supported terms.'),
        guarantyScope: z.enum(['none', 'limited-conduct', 'full-performance']),
        equipment: z.enum(['none', 'merchant-elects']),
        renewalModel: z.enum(['none', 'payoff-only', 'carry']),
        concurrentPositions: z.boolean(),
        // The funder's own fees. Twenty is a ceiling on a form, not a policy.
        //
        // A default, so a revision saved before this release still opens and
        // reads as charging nothing — which is what the Appendix clause says an
        // unlisted fee costs.
        fees: z.array(ZMcaFee).max(20).default([]),
        // Both answers are authored and selectable: the court programme carries
        // the jury, class and counterclaim waivers, arbitration carries §7.26.
        // ADR 0020 §5.6 — a lawful term a funder wants is one the platform
        // supports; Pacta holds no position on which a funder should choose.
        disputeResolution: z.enum(['courts', 'arbitration']),
        recipientStates: z
          .array(
            z.custom<McaJurisdiction>(
              (value) => typeof value === 'string' && MCA_JURISDICTIONS.includes(value as McaJurisdiction),
              'Select a supported state.',
            ),
          )
          .min(1)
          .max(MCA_JURISDICTIONS.length)
          .refine((states) => new Set(states).size === states.length, 'Select each state once.'),
        brokerChannel: z.boolean(),
        consumerReportPulled: z.boolean(),
      })
      .strict(),
    equipmentProvider: ZEntity.extend({ creditDisputeAddress: z.union([z.literal(''), line(600)]).optional() })
      .strict()
      .nullable(),
    broker: z
      .object({
        company: ZEntity,
        portalUrl: z
          .string()
          .trim()
          .url()
          .max(1000)
          .refine((value) => {
            const url = new URL(value);
            return url.protocol === 'https:' && !url.username && !url.password;
          }, 'Use an HTTPS portal URL without credentials.'),
        commissionPercentage: z.number().finite().min(0).max(100),
        // The current ISO instrument has fixed Florida/Pasco arbitration terms;
        // selecting a channel is not permission to silently invent another forum.
        fixedIsoTermsAccepted: z.boolean().refine(Boolean, 'Confirm the fixed ISO terms.'),
      })
      .strict()
      .nullable(),
    processor: z
      .object({
        legalName: line(),
        requiredForm: z.object({ title: line(), version: line(120), reference: line(1000) }).strict(),
      })
      .strict(),
  })
  .strict()
  .superRefine((profile, context) => {
    if (profile.policy.equipment === 'merchant-elects' && !profile.equipmentProvider) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['equipmentProvider'],
        message: 'Identify the separate equipment contracting entity.',
      });
    }
    if (profile.policy.brokerChannel && !profile.broker) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['broker'],
        message: 'Identify the ISO contracting company, portal and commission terms.',
      });
    }
    if (profile.policy.venueRule === 'funder-state') {
      if (!profile.buyer.venueState) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['buyer', 'venueState'],
          message: 'Name the state whose courts hear an action under the Agreement.',
        });
      }
      // Va. Code §6.2-2234(A) makes a forum outside the Commonwealth
      // unenforceable for a covered transaction, and a Virginia recipient is
      // defined by its principal place of business. A merchant-state rule
      // satisfies that by construction; this one does not, so the programme
      // cannot claim both.
      if (profile.policy.recipientStates.includes('US-VA')) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['policy', 'venueRule'],
          message:
            'A Virginia programme cannot fix the funder’s forum: Va. Code §6.2-2234(A) requires an action under a covered contract to be brought in the Commonwealth.',
        });
      }
    }
  });

export type McaProviderProfile = z.infer<typeof ZMcaProviderProfile>;

/**
 * What may be handed to the compiler, as opposed to what comes back parsed.
 *
 * `fees` has a default, so a revision saved before it existed is valid input
 * and gains an empty schedule on the way through. Typing the compiler's
 * parameter as the parsed profile would reject exactly those saved rows.
 */
export type McaProviderProfileInput = z.input<typeof ZMcaProviderProfile>;

/** Legacy selection accepts one additional transaction fact; it is never an interview answer. */
export const providerSelectionFacts = (profile: McaProviderProfile): McaFacts => ({
  collectionMethod: profile.policy.collectionMethod,
  settlementBase: profile.policy.settlementBase,
  venueRule: profile.policy.venueRule,
  guarantyScope: profile.policy.guarantyScope,
  equipment: profile.policy.equipment,
  renewalModel: profile.policy.renewalModel,
  concurrentPositions: profile.policy.concurrentPositions,
  disputeResolution: profile.policy.disputeResolution,
  recipientStates: [...profile.policy.recipientStates].sort(),
  brokerChannel: profile.policy.brokerChannel,
  consumerReportPulled: profile.policy.consumerReportPulled,
  processorSplitAccepted: false,
});

/** Provider-owned inputs remain read-only in a future transaction, even if still missing. */
export const MCA_PROVIDER_BINDINGS = new Set([
  'provider.legalName',
  'provider.entityType',
  'provider.organizationState',
  'provider.principalAddress',
  'provider.noticeAddress',
  'provider.noticeEmail',
  'provider.reconciliationEmail',
  'provider.reconciliationAddress',
  'provider.servicingPhone',
  'provider.venueForum',
  'processor.approvedProcessors',
  'equipment.providerLegalName',
  'equipment.providerEntityType',
  'equipment.providerFormationState',
  'equipment.providerAddress',
  'equipment.providerNoticeAddress',
  'equipment.providerNoticeEmail',
  'equipment.creditDisputeAddress',
  'iso.companyLegalName',
  'iso.portalUrl',
  'iso.commissionPercentage',
]);
