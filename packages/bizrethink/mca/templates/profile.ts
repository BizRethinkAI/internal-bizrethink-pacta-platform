import { z } from 'zod';

import type { McaFacts } from '../clauses/facts';
import { MCA_JURISDICTIONS, type McaJurisdiction } from '../jurisdictions';

/** Plain input values cannot introduce another template directive or paragraph. */
const line = (max = 240) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (value) => !/\{\{|\[\[|«|»/.test(value) && [...value].every((character) => character.charCodeAt(0) >= 32),
      'Enter a plain value, without template markers or line breaks.',
    );
const email = z.string().trim().email().max(254);
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
/** The same dollar shape the transaction layer validates: no symbol, two decimals at most. */
const money = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/, 'Enter a dollar amount, for example 500.00.');

/**
 * One row of the completed Appendix A.
 *
 * The shape is not invented here: `frpa.appendix-a-fees-collectible` says a fee
 * may be charged only if the completed Appendix identifies it "by its name, its
 * dollar amount or a lawful calculation method, the person to whom it is paid,
 * what it is for, and when it is charged". These are those five, and the
 * either/or is why `basis` exists rather than two optional strings.
 *
 * A fee not listed here is $0.00 by the clause's own terms, so an empty
 * schedule is a complete answer, not a missing one.
 */
export const ZMcaFee = z.discriminatedUnion('basis', [
  z
    .object({
      basis: z.literal('amount'),
      name: line(200),
      amount: money,
      payee: line(200),
      purpose: line(400),
      when: line(400),
    })
    .strict(),
  z
    .object({
      basis: z.literal('method'),
      name: line(200),
      method: line(400),
      payee: line(200),
      purpose: line(400),
      when: line(400),
    })
    .strict(),
]);

export type McaFee = z.infer<typeof ZMcaFee>;

export const ZMcaProviderProfile = z
  .object({
    label: line(120),
    buyer: ZEntity.extend({
      reconciliationEmail: email,
      reconciliationAddress: line(600),
      servicingPhone: z.union([z.literal(''), line(80)]).optional(),
    }).strict(),
    policy: z
      .object({
        collectionMethod: z.literal('split-only'),
        settlementBase: z.literal('net'),
        venueRule: z.literal('merchant-state'),
        // An express provider answer; the draft's example profile is not evidence.
        supportedTermsConfirmed: z.boolean().refine(Boolean, 'Confirm that these are your supported terms.'),
        guarantyScope: z.enum(['none', 'limited-conduct', 'full-performance']),
        equipment: z.enum(['none', 'merchant-elects']),
        renewalModel: z.enum(['none', 'payoff-only', 'carry']),
        concurrentPositions: z.boolean(),
        // The funder's own fees. Twenty is a ceiling on a form, not a policy.
        fees: z.array(ZMcaFee).max(20).default([]),
        // The current provider-template release supports the court bundle. The
        // authored arbitration alternative remains available for legal review.
        disputeResolution: z.literal('courts'),
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
  });

export type McaProviderProfile = z.infer<typeof ZMcaProviderProfile>;

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
