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
import type { McaJurisdiction } from '../jurisdictions';
import { normalisedDigest, readSourceText } from '../provenance/source-text';
import { disclosuresFor } from '../registry';
import { reusableFor } from '../reusable/library';
import {
  type McaFee,
  type McaProviderProfile,
  type McaProviderProfileInput,
  providerSelectionFacts,
  ZMcaProviderProfile,
} from './profile';

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
  ...(profile.buyer.venueState
    ? {
        'provider.venueForum': [profile.buyer.venueCounty, profile.buyer.venueState].filter(Boolean).join(', '),
      }
    : {}),
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

/**
 * A reusable recipe for ONE document, not a filled transaction or authority to
 * send legal text.
 *
 * ADR 0026: **entity + type = one template.** It used to compile whichever set
 * of documents the policy selected, and that set existed nowhere else —
 * `lombard-api` holds five separate published templates, each with its own
 * `templateId`, each sent on its own. The caller has never seen a package.
 *
 * `instrumentsFor` still decides which documents a programme is ENTITLED to
 * have; it no longer decides what a template contains. Asking for one the
 * policy does not support is refused rather than silently compiled, because a
 * template for a document the programme does not run is a document nobody can
 * lawfully send.
 */
export const compileMcaTemplate = (input: McaProviderProfileInput, instrument: McaInstrument): McaTemplateSnapshot => {
  const profile = ZMcaProviderProfile.parse(input);
  profile.policy.recipientStates.sort();
  const facts = providerSelectionFacts(profile);

  // A processor's actual form remains externally controlled and separately
  // reviewed (ADR 0019); the builder produces none.
  if (instrument === 'split-funding') {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'A split funding letter is the processor’s and is never built here.',
    });
  }

  if (!instrumentsFor(facts).includes(instrument)) {
    // Named by title where we have one; an unknown instrument still has to
    // refuse clearly rather than throw reading a property off undefined, which
    // is what it did and which masked the real call site.
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: `This programme does not run a ${INSTRUMENTS[instrument]?.title ?? instrument}.`,
    });
  }

  const selections = [{ instrument, clauses: selectClauses({ facts, instrument }).selected }];

  /*
    THIS DOCUMENT'S CLAUSES, AND ONLY ITS OWN.

    It used to be every selected document's clauses, so a clause could cite one
    in another and resolve a number. Exactly one did — the ISO PRA's commission
    clause, citing the FRPA — and ADR 0026 reworded it to name the Right to
    Cancel provision instead. `numbering.test.ts` asserts nothing in the library
    crosses a document, so this cannot silently start failing to resolve.
  */
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
    /*
      WHICH DOCUMENT THIS TEMPLATE IS, carried at the top level and not only
      inside `documents[0]`.

      A recompile has to ask for the same document to produce the same
      fingerprint, and `isMcaTemplateCurrent` recompiles from the snapshot
      alone. Without this it had nothing to ask for — it recompiled with no
      instrument at all, which under ADR 0026 no longer has a meaning.
    */
    instrument,
    profile,
    documents,
    externalDocuments,
    requirements,
    readyToSend: false as const,
  };
  return { ...snapshot, fingerprint: hash(snapshot) };
};

/**
 * What a state disclosure obliges this programme to do, listed and never decided.
 */
export type McaTemplateRequirement = {
  slug: string;
  jurisdiction: McaJurisdiction;
  citation: string;
  /*
    WIDE ON PURPOSE. Narrowing this to the three literals makes the declared
    type disagree with what the compiler's own expression infers, and nothing
    discriminates on it — a requirement is listed, never branched on.
  */
  kind: string;
  transaction: string;
  applicability: 'determine-per-transaction';
  specFingerprint: string;
  sourceDigest: string;
};

/** A form this programme needs but does not produce — the processor's letter (ADR 0019). */
export type McaTemplateExternalDocument = {
  instrument: 'split-funding';
  processor: string;
  form: { title: string; version: string; reference: string };
  control: 'processor-controlled';
  acceptance: 'required-per-transaction';
};

/**
 * DECLARED, NOT INFERRED FROM `compileMcaTemplate`.
 *
 * It was `ReturnType<typeof compileMcaTemplate>`, and that inference is
 * circular — `projectTemplateReading` is generic over this type and feeds the
 * tRPC preview route, so resolving it required resolving itself. TypeScript
 * answers a circular inference with `any` and says nothing, which is how a
 * snapshot missing `instrument` reached a component prop that requires it and
 * only failed there.
 */
export type McaTemplateSnapshot = {
  schemaVersion: 1;
  /** Which document this template is. ADR 0026: entity + type = one template. */
  instrument: McaInstrument;
  profile: McaProviderProfile;
  documents: McaTemplateDocument[];
  externalDocuments: McaTemplateExternalDocument[];
  requirements: McaTemplateRequirement[];
  readyToSend: false;
  fingerprint: string;
};

export const isMcaTemplateCurrent = (snapshot: McaTemplateSnapshot): boolean =>
  snapshot.schemaVersion === 1 &&
  snapshot.fingerprint === compileMcaTemplate(snapshot.profile, snapshot.instrument).fingerprint;
