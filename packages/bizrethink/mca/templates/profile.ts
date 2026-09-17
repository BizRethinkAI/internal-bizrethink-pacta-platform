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
export const ZMcaProviderProfile = z
  .object({
    label: line(120),
    buyer: ZEntity.extend({
      reconciliationEmail: email,
      reconciliationAddress: line(600),
      servicingPhone: z.union([z.literal(''), line(80)]).optional(),
      // Printed on the cover and in the page footer, as the funder's own
      // documents carry it. Optional: an older saved revision has none and
      // renders with the line absent rather than a placeholder.
      website: z.union([z.literal(''), line(120)]).optional(),
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
