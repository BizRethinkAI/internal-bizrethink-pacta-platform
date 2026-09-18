import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { McaInstrument } from '../clauses/instruments';

/**
 * Who signs each template the builder produces, and under what name.
 *
 * `role` is the key the funder's platform addresses a recipient by, both when
 * sending (`recipients: { merchant: {...} }`) and when reading the result back
 * (`recipientTokens.merchant`, `signingUrls.merchant`). It is an interface this
 * repository does not deploy — but unlike a widget name, a role key that stops
 * matching fails loudly: `sendDocument` throws rather than sending a document
 * nobody can sign.
 *
 * `signs` is the binding prefix that supplies this party's `.signature` and
 * `.signedDate`. Those two must be **native Documenso placeholders** in a
 * published template, never AcroForm widgets: a widget is sender-writable only,
 * so a signature slot built as one ships permanently blank.
 *
 * The numeric recipient ids are deliberately not here. They belong to a
 * template, are captured when it is published, and a template the builder
 * produces has new ones — which is why ADR 0023 §2 puts the record in Pacta
 * rather than in a vendored JSON file.
 */
export type SigningParty = {
  role: string;
  signingOrder: number;
  signs: string;
};

/**
 * The instruments the builder publishes. `split-funding` is absent on purpose:
 * ADR 0019 makes the letter the processor's, used exactly as supplied, and
 * `compile.ts` already excludes it from the assembled documents.
 */
export const PRODUCED_INSTRUMENTS = [
  'frpa',
  'equipment-lease',
  'subscription',
  'iso-pra',
  'permission-to-release',
] as const satisfies readonly McaInstrument[];

export type ProducedInstrument = (typeof PRODUCED_INSTRUMENTS)[number];

/**
 * Narrow a stored `instrument` column to a document the builder produces.
 *
 * `BizrethinkMcaTemplate.instrument` is a `String`, so reading it back proved
 * nothing and every call site cast. A cast asserts what nothing checked, on
 * the path that decides whether a template can be published at all — and ADR
 * 0019 means `split-funding` is a value no template may legitimately hold, so
 * it is a state to handle rather than to assert away.
 *
 * Parsed on the way out, not cast, for the reason `getMcaEntity` gives: a row
 * written before a schema change, or edited outside the service, would
 * otherwise flow on as though it were valid. The create route already
 * constrains new rows with `z.enum(PRODUCED_INSTRUMENTS)`; this makes the read
 * agree with the write instead of trusting it.
 */
export const producedInstrumentOf = (value: string, templateId: string): ProducedInstrument => {
  const found = PRODUCED_INSTRUMENTS.find((produced) => produced === value);

  if (!found) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: `Template ${templateId} names a document this builder does not produce: ${value}.`,
    });
  }

  return found;
};

/**
 * The lease and the subscription share one live template, so they share its
 * parties. The role names are the lease's — the platform has no
 * `equipment-lease` kind and resolves both to that record.
 *
 * `counter_signer` is the funder's own side. The library calls the same party
 * the equipment provider, because in the document it is whoever supplies the
 * equipment; the two names describe the same signature.
 */
const EQUIPMENT: SigningParty[] = [
  { role: 'lessee', signingOrder: 1, signs: 'signers.merchant' },
  { role: 'guarantor', signingOrder: 2, signs: 'guarantor' },
  { role: 'counter_signer', signingOrder: 3, signs: 'signers.equipmentProvider' },
];

export const RECIPIENTS: Record<ProducedInstrument, SigningParty[]> = {
  frpa: [
    { role: 'merchant', signingOrder: 1, signs: 'signers.merchant' },
    // A separate legal capacity, so a separate recipient with its own token and
    // audit trail — even though the platform sends both rows to one address
    // when the principal is also the guarantor.
    { role: 'guarantor', signingOrder: 2, signs: 'guarantor' },
    { role: 'buyer', signingOrder: 3, signs: 'signers.buyer' },
  ],
  'equipment-lease': EQUIPMENT,
  subscription: EQUIPMENT,
  'iso-pra': [
    // The partner signs first and the company counter-signs. `iso` is the
    // broker of `instruments.ts` — a party owed no disclosure and constrained
    // in what it may say, which is why §2.6 exists.
    { role: 'iso', signingOrder: 1, signs: 'signers.isoPartner' },
    { role: 'company', signingOrder: 2, signs: 'signers.isoCompany' },
  ],
  'permission-to-release': [
    { role: 'merchant', signingOrder: 1, signs: 'signers.merchant' },
    // The permission is given by the individual whose consumer report is
    // pulled, which is why this party signs under `report` rather than
    // `guarantor`: the capacity is subject-of-the-report, not surety.
    { role: 'guarantor', signingOrder: 2, signs: 'report' },
  ],
};
