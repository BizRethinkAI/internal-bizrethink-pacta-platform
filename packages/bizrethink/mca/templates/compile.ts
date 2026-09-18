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
import { entitySelectionFacts, type McaEntity, type McaEntityInput, ZMcaEntity } from '../entities/entity';
import type { McaJurisdiction } from '../jurisdictions';
import type { McaFee } from '../plain-values';
import { normalisedDigest, readSourceText } from '../provenance/source-text';
import { disclosuresFor } from '../registry';
import { reusableFor } from '../reusable/library';

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

/**
 * What the ENTITY supplies, printed into the document at publication.
 *
 * ADR 0026 §5: our side is a Pacta record and prints; every other party comes
 * from the caller per send and is a widget. So `processor.*` and `iso.*` are
 * gone from here — a processor is a fact about the deal (§6) and there is never
 * a template per broker.
 *
 * `equipment.provider*` stays, and means the entity itself: on an equipment
 * lease or a subscription the entity IS the lessor. The FRPA's mention of a
 * possibly-different affiliate is a separate binding, filled by the caller —
 * see `populateEntity`.
 */
export const entityValues = (entity: McaEntity): Record<string, string> => {
  const { identity } = entity;
  const venueForum = [identity.venueCounty, identity.venueState].filter(Boolean).join(', ');

  return {
    'provider.legalName': identity.legalName,
    'provider.entityType': identity.entityType,
    'provider.organizationState': identity.organizationState,
    'provider.principalAddress': identity.address,
    'provider.noticeAddress': identity.noticeAddress,
    'provider.noticeEmail': identity.noticeEmail,
    'provider.reconciliationEmail': identity.reconciliationEmail,
    'provider.reconciliationAddress': identity.reconciliationAddress,
    ...(identity.servicingPhone ? { 'provider.servicingPhone': identity.servicingPhone } : {}),
    ...(identity.venueState ? { 'provider.venueForum': venueForum } : {}),

    // The entity as lessor. Same company, so the same answers.
    'equipment.providerLegalName': identity.legalName,
    'equipment.providerEntityType': identity.entityType,
    'equipment.providerFormationState': identity.organizationState,
    'equipment.providerAddress': identity.address,
    'equipment.providerNoticeAddress': identity.noticeAddress,
    'equipment.providerNoticeEmail': identity.noticeEmail,
    ...(identity.creditDisputeAddress ? { 'equipment.creditDisputeAddress': identity.creditDisputeAddress } : {}),

    // The Company on its own channel agreement — us, not the broker.
    'iso.companyLegalName': identity.legalName,
    ...(identity.partnerPortalUrl ? { 'iso.portalUrl': identity.partnerPortalUrl } : {}),
  };
};

/**
 * Substitute the role tokens and the entity's own bindings.
 *
 * `{{equipmentAffiliate}}` RESOLVES DIFFERENTLY PER DOCUMENT, and that is the
 * point. On an equipment lease or a subscription the lessor is the entity
 * issuing the document, so its name prints. On the FRPA the clause names
 * whoever the merchant leases from, which may be a different company of the
 * funder's — a template names one entity, so the FRPA cannot know it and the
 * caller sends it. Owner's decision, recorded here because the alternative
 * silently prints FundCo where OpCo belongs, in a clause about who the
 * merchant owes money to.
 *
 * `{{processor}}` is gone: a processor is never selected in a template (§6).
 */
export const populateEntity = (
  body: string,
  entity: McaEntity,
  instrument: McaInstrument,
  values: Record<string, string>,
) => {
  const entityIsTheLessor = instrument === 'equipment-lease' || instrument === 'subscription';

  return body
    .replace(/\{\{(funder|equipmentAffiliate)\}\}/g, (_token, role: string) =>
      role === 'funder' || entityIsTheLessor ? entity.identity.legalName : '{{field:equipment.affiliateLegalName}}',
    )
    .replace(/\{\{field:([^}]+)\}\}/g, (token, binding: string) => values[binding] ?? token);
};

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
export const compileMcaTemplate = (input: McaEntityInput, instrument: McaInstrument): McaTemplateSnapshot => {
  const entity = ZMcaEntity.parse(input);

  entity.policy.recipientStates.sort();

  const facts = entitySelectionFacts(entity);

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
  const values = entityValues(entity);
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
      feeSchedule: instrument === 'frpa' ? entity.policy.fees : [],
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
          body: populateEntity(entry.body, entity, instrument, values),
          number: numbers.get(entry.slug) ?? null,
          fields: (entry.fields ?? []).map((field) => ({ ...field, value: values[field.binding] ?? null })),
          repeatFor: entry.repeatFor ?? null,
        };
      }),
    };
  });
  const requirements = entity.policy.recipientStates.flatMap((jurisdiction) =>
    disclosuresFor(jurisdiction)
      .filter(
        (spec) =>
          !('transaction' in spec) || spec.transaction !== 'lease-financing' || entity.policy.equipment !== 'none',
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
    entity,
    documents,
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

/**
 * DECLARED, NOT INFERRED FROM `compileMcaTemplate`.
 *
 * It was `ReturnType<typeof compileMcaTemplate>`. This is the shape the review,
 * publish and reading pipelines are all written against and the shape the tRPC
 * preview route returns, so it is worth stating rather than deriving: a
 * declared type is checked against what the compiler actually builds, and it
 * already caught `kind` and the processor's `form` being looser than intended.
 */
export type McaTemplateSnapshot = {
  schemaVersion: 1;
  /** Which document this template is. ADR 0026: entity + type = one template. */
  instrument: McaInstrument;
  entity: McaEntity;
  documents: McaTemplateDocument[];
  requirements: McaTemplateRequirement[];
  readyToSend: false;
  fingerprint: string;
};

export const isMcaTemplateCurrent = (snapshot: McaTemplateSnapshot): boolean =>
  snapshot.schemaVersion === 1 &&
  snapshot.fingerprint === compileMcaTemplate(snapshot.entity, snapshot.instrument).fingerprint;
