import { z } from 'zod';

import type { McaFacts } from '../clauses/facts';

import { MCA_JURISDICTIONS, type McaJurisdiction } from '../jurisdictions';
import { email, line, optionalLine, ZMcaFee } from '../plain-values';

/**
 * The legal entity that issues a document, and how its programme runs.
 *
 * ADR 0026: **entity + type = one template.** An entity is saved once and
 * chosen when a template is created, so a funder types its own name and
 * addresses once rather than once per document — the rule
 * `BizrethinkProperty` already states for the lease, where re-asking facts that
 * do not change "is how an interview earns a reputation for being tedious."
 *
 * WHAT AN ENTITY IS NOT. It is not a counterparty. The merchant, the guarantor,
 * the ISO partner, the processor and the report subject all come from the
 * caller at send time, and there will never be a template per broker for the
 * same reason there is not one per deal. An entity is **our side**, and that is
 * the whole of the distinction.
 *
 * PACTA DOES NOT KNOW WHAT KIND OF COMPANY THIS IS. A funder may issue its
 * receivables paper from one company and its equipment paper from another;
 * those are its own arrangements. Pacta holds entities and knows which document
 * a template produces, and nothing more.
 */

/**
 * Who this entity is, as it appears in a document.
 *
 * The same six fields the profile's `ZEntity` carries today, plus what the
 * buyer alone needed — because under ADR 0026 every slot that used to be
 * buyer, equipment provider or broker company is the same thing: our side.
 */
export const ZMcaEntityIdentity = z
  .object({
    legalName: line(),
    entityType: line(100),
    organizationState: line(100),
    address: line(600),
    noticeEmail: email,
    noticeAddress: line(600),

    /** Where a merchant writes to ask for a reconciliation. */
    reconciliationEmail: email,
    reconciliationAddress: line(600),
    servicingPhone: optionalLine(80).optional(),

    /**
     * Where this entity litigates, needed only by a funder-state venue rule.
     *
     * An explicit forum rather than the state of organisation: a funder
     * organised in Delaware litigates where it works. County optional — an
     * entity naming only a state gets a state-wide forum.
     */
    venueState: optionalLine(100).optional(),
    venueCounty: optionalLine(100).optional(),

    /** Printed on the cover and in the footer, as the funder's own documents carry it. */
    website: optionalLine(120).optional(),

    /**
     * Where a broker signs in to see what it is owed.
     *
     * The funder's own portal, not the broker's, which is why it belongs here
     * and not to the caller — the ISO PRA's commission-transparency clause
     * names it, and it is the same URL for every broker.
     */
    partnerPortalUrl: optionalLine(200).optional(),

    /** Where a customer disputes what this entity reported about them. */
    creditDisputeAddress: optionalLine(600).optional(),
  })
  .strict();

/**
 * How this entity's programme runs.
 *
 * Answered once here rather than once per template, and **copied into a
 * template revision when one is created** — never read live. Revisions are
 * immutable and `publishMcaTemplate` publishes against a named one, so editing
 * an entity must not change what an already-published document says.
 *
 * These are facts about the programme, not about a document: they decide which
 * clauses a document contains, which is why they belong to the entity that runs
 * it rather than to each document separately.
 */
export const ZMcaEntityPolicy = z
  .object({
    collectionMethod: z.literal('split-only'),
    settlementBase: z.literal('net'),
    venueRule: z.enum(['merchant-state', 'funder-state']),
    disputeResolution: z.enum(['courts', 'arbitration']),
    guarantyScope: z.enum(['none', 'limited-conduct', 'full-performance']),
    renewalModel: z.enum(['none', 'payoff-only', 'carry']),
    concurrentPositions: z.boolean(),
    /** Whether this programme places equipment at all. */
    equipment: z.enum(['none', 'merchant-elects']),
    /** Whether it takes business through brokers. */
    brokerChannel: z.boolean(),
    /** Whether it pulls a consumer report, which a separate permission covers. */
    consumerReportPulled: z.boolean(),
    supportedTermsConfirmed: z.boolean().refine(Boolean, 'Confirm that these are your supported terms.'),
    /*
      Typed as `McaJurisdiction`, not `string`. The requirements list a
      compiled template carries is keyed by jurisdiction, and a loose type here
      made every one of them `string` all the way out to the caller.
    */
    recipientStates: z
      .array(z.enum(MCA_JURISDICTIONS as unknown as [McaJurisdiction, ...McaJurisdiction[]]))
      .max(MCA_JURISDICTIONS.length),
    fees: z.array(ZMcaFee).max(20).default([]),
  })
  .strict()
  .superRefine((policy, context) => {
    /*
      A PROGRAMME CANNOT CLAIM BOTH. Va. Code §6.2-2234(A) makes a forum outside
      the Commonwealth unenforceable for a covered transaction, and a Virginia
      recipient is defined by its principal place of business. A merchant-state
      rule satisfies that by construction; this one does not.

      Carried over from the profile unchanged — it is a contradiction inside the
      goods, which is Pacta's business, as distinct from telling a funder where
      it may operate, which is not.
    */
    if (policy.venueRule === 'funder-state' && policy.recipientStates.includes('US-VA')) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['venueRule'],
        message:
          'A Virginia programme cannot fix the funder’s forum: Va. Code §6.2-2234(A) requires an action under a covered contract to be brought in the Commonwealth.',
      });
    }
  });

export const ZMcaEntity = z
  .object({
    /** How a person picks this record out of a list. */
    label: line(120),
    identity: ZMcaEntityIdentity,
    policy: ZMcaEntityPolicy,
  })
  .strict()
  .superRefine((entity, context) => {
    // A funder-state forum needs somewhere to name. Checked across the two
    // halves, which is why it lives here rather than on either.
    if (entity.policy.venueRule === 'funder-state' && !entity.identity.venueState) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['identity', 'venueState'],
        message: 'Name the state whose courts hear an action under the Agreement.',
      });
    }
  });

export type McaEntityIdentity = z.infer<typeof ZMcaEntityIdentity>;
export type McaEntityPolicy = z.infer<typeof ZMcaEntityPolicy>;
export type McaEntity = z.infer<typeof ZMcaEntity>;
export type McaEntityInput = z.input<typeof ZMcaEntity>;

/**
 * The facts clause selection runs on.
 *
 * Every one of them comes from `policy`, which is why policy belongs to the
 * entity rather than to each document: two documents from one programme must
 * not disagree about the guaranty.
 *
 * `processorSplitAccepted` is false here and always will be. It is a fact about
 * a deal — whether this merchant's processor accepted the split — and a
 * template is not a deal (ADR 0025).
 */
export const entitySelectionFacts = (entity: Pick<McaEntity, 'policy'>): McaFacts => ({
  collectionMethod: entity.policy.collectionMethod,
  settlementBase: entity.policy.settlementBase,
  venueRule: entity.policy.venueRule,
  guarantyScope: entity.policy.guarantyScope,
  equipment: entity.policy.equipment,
  renewalModel: entity.policy.renewalModel,
  concurrentPositions: entity.policy.concurrentPositions,
  disputeResolution: entity.policy.disputeResolution,
  recipientStates: [...entity.policy.recipientStates].sort(),
  brokerChannel: entity.policy.brokerChannel,
  consumerReportPulled: entity.policy.consumerReportPulled,
  processorSplitAccepted: false,
});

/**
 * The bindings the ENTITY supplies, printed into the document at publication.
 *
 * A binding in this set is already in the compiled text, so it must NOT also
 * become an AcroForm widget the caller fills — `field-plan.ts` is where that
 * split is made.
 *
 * ADR 0026 §5 moves two out of it:
 *
 *   `processor.approvedProcessors`  which processor a merchant uses is a fact
 *                                   about the deal (§6)
 *   `iso.commissionPercentage`      a term with a particular broker, and a live
 *                                   widget today — the caller already sends it
 *
 * TWO `iso.*` BINDINGS STAY, and the naming is a trap worth stating. On the ISO
 * PRA `iso.companyLegalName` is the **Company** — us — while the broker is
 * `iso.partnerLegalName`. ADR 0026 §5 cites that very widget as its evidence
 * that our side is a Pacta record. Moving it out would have made the funder's
 * own legal name a field the caller fills on its own channel agreement.
 * `iso.portalUrl` is likewise the funder's partner portal, not the broker's.
 *
 * And one binding is new and deliberately absent from here:
 * `equipment.affiliateLegalName`, the FRPA's mention of whoever the merchant
 * leases equipment from. A template names one entity, so the FRPA cannot know
 * a separate equipment company of the funder's and the caller sends it. On an
 * equipment lease or subscription the entity IS the lessor, which is why
 * `equipment.provider*` below stay printed.
 */
export const MCA_ENTITY_BINDINGS = new Set([
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
  'equipment.providerLegalName',
  'equipment.providerEntityType',
  'equipment.providerFormationState',
  'equipment.providerAddress',
  'equipment.providerNoticeAddress',
  'equipment.providerNoticeEmail',
  'equipment.creditDisputeAddress',
  'iso.companyLegalName',
  'iso.portalUrl',
]);
