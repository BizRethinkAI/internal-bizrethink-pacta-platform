import { createHash } from 'node:crypto';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { LegalReading } from '../../legal-ui/reading';
import { contentFor } from '../catalogue';
import { mcaClauseFingerprint } from '../clauses/approval';
import { INSTRUMENTS, type McaInstrument } from '../clauses/instruments';
import { inReviewOrder } from '../clauses/library';
import type { ClauseField, McaContent, McaReusableContent } from '../clauses/types';
import { resolveReferences, type SelectedMcaClause } from '../engine/number-clauses';
import { instrumentsFor, selectClauses } from '../engine/select-clauses';
import { normalisedDigest, readSourceText } from '../provenance/source-text';
import { disclosuresFor } from '../registry';
import { reusableFor } from '../reusable/library';
import { type McaFee, type McaProviderProfile, providerSelectionFacts, ZMcaProviderProfile } from './profile';

export type McaTemplateItem = {
  /** Ephemeral presentation only, added after compiling/hashing a saved recipe. */
  reading?: LegalReading;
  slug: string;
  version: number;
  /** Selected source data; separate from counsel approval, which also pins the gate. */
  sourceFingerprint: string;
  kind: McaContent['kind'];
  section: string;
  heading: string;
  body: string;
  number: string | null;
  fields: (ClauseField & { value: string | null })[];
  repeatFor: 'guarantor' | null;
};

export type McaTemplateDocument = {
  instrument: McaInstrument;
  title: string;
  counterparty: string;
  transactionSelection: 'always' | 'equipment-lease' | 'subscription' | 'individual-report' | 'broker-channel';
  items: McaTemplateItem[];
  /**
   * The completed Appendix A this document's fee clause refers to. Empty means
   * the funder charges nothing, which the clause reads as $0.00 — not that the
   * schedule is missing.
   */
  feeSchedule: McaFee[];
};

/** Stable structural placement. Missing/cyclic anchors fail instead of dropping required content. */
export const placeReusableContent = (clauses: SelectedMcaClause[], reusable: McaReusableContent[]): McaContent[] => {
  const placed = new Set<string>();
  const visiting = new Set<string>();
  const result: McaContent[] = [];
  const helpers = inReviewOrder(reusable);
  const place = (entry: McaContent) => {
    if (visiting.has(entry.slug)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, { message: `Cyclic MCA placement: ${entry.slug}.` });
    }
    if (placed.has(entry.slug)) {
      return;
    }
    visiting.add(entry.slug);
    for (const helper of helpers.filter(
      (item) => item.placement && 'before' in item.placement && item.placement.before === entry.slug,
    )) {
      place(helper);
    }
    result.push(entry);
    placed.add(entry.slug);
    for (const helper of helpers.filter(
      (item) => item.placement && 'after' in item.placement && item.placement.after === entry.slug,
    )) {
      place(helper);
    }
    visiting.delete(entry.slug);
  };
  for (const section of new Set(clauses.map((entry) => entry.section))) {
    const atEdge = (edge: 'start' | 'end') =>
      helpers.filter(
        (entry) =>
          entry.placement &&
          'section' in entry.placement &&
          entry.placement.section === section &&
          entry.placement.edge === edge,
      );
    for (const entry of atEdge('start')) {
      place(entry);
    }
    for (const entry of clauses.filter((item) => item.section === section)) {
      place(entry);
    }
    for (const entry of atEdge('end')) {
      place(entry);
    }
  }
  const missing = helpers.filter((entry) => !placed.has(entry.slug));
  if (missing.length) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: `Required MCA content has no placement: ${missing.map((entry) => entry.slug).join(', ')}.`,
    });
  }
  return result;
};

/** Identity answers populate variables; no example tenant supplies missing facts. */
export const providerValues = (profile: McaProviderProfile): Record<string, string> => ({
  'provider.legalName': profile.buyer.legalName,
  'provider.entityType': profile.buyer.entityType,
  'provider.organizationState': profile.buyer.organizationState,
  'provider.principalAddress': profile.buyer.address,
  'provider.noticeAddress': profile.buyer.noticeAddress,
  'provider.noticeEmail': profile.buyer.noticeEmail,
  'provider.reconciliationEmail': profile.buyer.reconciliationEmail,
  'provider.reconciliationAddress': profile.buyer.reconciliationAddress,
  ...(profile.buyer.servicingPhone ? { 'provider.servicingPhone': profile.buyer.servicingPhone } : {}),
  'processor.approvedProcessors': profile.processor.legalName,
  ...(profile.equipmentProvider
    ? {
        'equipment.providerLegalName': profile.equipmentProvider.legalName,
        'equipment.providerEntityType': profile.equipmentProvider.entityType,
        'equipment.providerFormationState': profile.equipmentProvider.organizationState,
        'equipment.providerAddress': profile.equipmentProvider.address,
        'equipment.providerNoticeAddress': profile.equipmentProvider.noticeAddress,
        'equipment.providerNoticeEmail': profile.equipmentProvider.noticeEmail,
        ...(profile.equipmentProvider.creditDisputeAddress
          ? { 'equipment.creditDisputeAddress': profile.equipmentProvider.creditDisputeAddress }
          : {}),
      }
    : {}),
  ...(profile.broker
    ? {
        'iso.companyLegalName': profile.broker.company.legalName,
        'iso.portalUrl': profile.broker.portalUrl,
        'iso.commissionPercentage': String(profile.broker.commissionPercentage),
      }
    : {}),
});

export const populateProvider = (body: string, profile: McaProviderProfile, values: Record<string, string>) =>
  body
    .replace(/\{\{(funder|equipmentAffiliate|processor)\}\}/g, (_token, role: string) => {
      if (role === 'funder') {
        return profile.buyer.legalName;
      }
      if (role === 'processor') {
        return profile.processor.legalName;
      }
      return profile.equipmentProvider?.legalName ?? '{{field:equipment.providerLegalName}}';
    })
    .replace(/\{\{field:([^}]+)\}\}/g, (token, binding: string) => values[binding] ?? token);

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** A reusable recipe, not a filled transaction or authority to send legal text. */
export const compileMcaTemplate = (input: McaProviderProfile) => {
  const profile = ZMcaProviderProfile.parse(input);
  profile.policy.recipientStates.sort();
  const facts = providerSelectionFacts(profile);
  // A processor's actual form remains externally controlled and separately reviewed.
  const instruments = instrumentsFor(facts).filter((instrument) => instrument !== 'split-funding');
  const selections = instruments.map((instrument) => ({
    instrument,
    clauses: selectClauses({ facts, instrument }).selected,
  }));
  const context = selections.flatMap((selection) => selection.clauses);
  const values = providerValues(profile);
  const documents: McaTemplateDocument[] = selections.map(({ instrument, clauses }) => {
    const helpers = reusableFor(instrument).filter(
      (entry) => entry.uses.includes('document') && (entry.includeWhen === null || entry.includeWhen(facts)),
    );
    const resolved = resolveReferences(helpers, context);
    const sourceBySlug = new Map(contentFor(instrument).map((entry) => [entry.slug, entry]));
    const numbers = new Map(clauses.map((entry) => [entry.slug, entry.number]));
    return {
      instrument,
      title: INSTRUMENTS[instrument].title,
      counterparty: INSTRUMENTS[instrument].counterparty,
      transactionSelection:
        instrument === 'equipment-lease' || instrument === 'subscription'
          ? instrument
          : instrument === 'permission-to-release'
            ? 'individual-report'
            : instrument === 'iso-pra'
              ? 'broker-channel'
              : 'always',
      // Fees belong to the agreement whose Appendix states them. The equipment
      // and subscription documents charge under their own terms, and the
      // processor's letter is not ours to price.
      feeSchedule: instrument === 'frpa' ? profile.policy.fees : [],
      items: placeReusableContent(clauses, resolved).map((entry) => {
        const source = sourceBySlug.get(entry.slug);
        if (!source || source.status === 'retired') {
          throw new AppError(AppErrorCode.INVALID_REQUEST, { message: `Unavailable MCA content: ${entry.slug}.` });
        }
        return {
          slug: entry.slug,
          version: entry.version,
          // The saved policy and the resulting selection are hashed below. A
          // predicate's printed code varies between server bundles and is not
          // recipe data. Keep the legal approval fingerprint itself unchanged.
          sourceFingerprint: mcaClauseFingerprint({ ...source, includeWhen: null }),
          kind: entry.kind,
          section: entry.section,
          heading: entry.heading,
          body: populateProvider(entry.body, profile, values),
          number: numbers.get(entry.slug) ?? null,
          fields: (entry.fields ?? []).map((field) => ({ ...field, value: values[field.binding] ?? null })),
          repeatFor: entry.repeatFor ?? null,
        };
      }),
    };
  });
  const requirements = profile.policy.recipientStates.flatMap((jurisdiction) =>
    disclosuresFor(jurisdiction)
      .filter(
        (spec) =>
          !('transaction' in spec) || spec.transaction !== 'lease-financing' || profile.policy.equipment !== 'none',
      )
      .map((spec) => {
        const sourceText = readSourceText(spec.sourceFile);
        return {
          slug: spec.slug,
          jurisdiction,
          citation: spec.citation,
          kind: 'requirements' in spec ? 'content-statute' : 'rows' in spec ? 'prescribed-form' : 'itemization',
          transaction: 'transaction' in spec ? spec.transaction : 'determine-statutory-scope',
          applicability: 'determine-per-transaction' as const,
          specFingerprint: hash(spec),
          sourceDigest: normalisedDigest(sourceText),
        };
      }),
  );
  const externalDocuments = [
    {
      instrument: 'split-funding' as const,
      processor: profile.processor.legalName,
      form: profile.processor.requiredForm,
      control: 'processor-controlled' as const,
      acceptance: 'required-per-transaction' as const,
    },
  ];
  const snapshot = {
    schemaVersion: 1 as const,
    profile,
    documents,
    externalDocuments,
    requirements,
    readyToSend: false as const,
  };
  return { ...snapshot, fingerprint: hash(snapshot) };
};

export type McaTemplateSnapshot = ReturnType<typeof compileMcaTemplate>;

export const isMcaTemplateCurrent = (snapshot: McaTemplateSnapshot): boolean =>
  snapshot.schemaVersion === 1 && snapshot.fingerprint === compileMcaTemplate(snapshot.profile).fingerprint;
