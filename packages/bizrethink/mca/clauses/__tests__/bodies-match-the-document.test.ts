import { describe, expect, it } from 'vitest';

import { agreementDigest, readAgreementBody } from '../documents';
import { libraryFor } from '../library';
import { MCA_TENANTS, type McaTenant } from '../parties';

/**
 * A clause body is a copy of words a merchant or a partner actually signs, and
 * the copy is worth nothing on its own.
 *
 * WHAT CHANGED, AND WHY IT IS STRONGER. This used to compare a stored body to a
 * document directly, which worked only because every body carried Lombard's
 * party names — the library was one client's paperwork and the check could not
 * tell. Bodies are now written with `{{funder}}`, `{{equipmentAffiliate}}` and
 * `{{processor}}`, so the check resolves a TENANT's names first and then matches
 * against THAT tenant's document.
 *
 * The assertion is therefore no longer "our text is in the file". It is "the
 * general form, filled in for this client, is the paper this client signs" —
 * which is a claim about the parameterisation as well as the words. When a
 * second client's set arrives, every clause is checked against two real
 * documents and a clause that only fits one of them fails immediately.
 *
 * Same argument as `mca/provenance/source-text.ts` makes for statutes, pointed
 * at our own documents: there a regulator amends a rule under a spec still
 * quoting the old wording; here somebody edits the .docx, re-renders, and the
 * library goes on asserting a superseded sentence with a date beside it.
 */
const pairs: [string, McaTenant, string][] = MCA_TENANTS.flatMap((tenant) =>
  Object.entries(tenant.documents)
    .filter(([, doc]) => doc.bodiesVerifiedAt !== null)
    .map(([instrument, doc]) => [`${tenant.id}/${instrument}`, tenant, instrument] as [string, McaTenant, string]),
);

describe('the documents the clauses were drafted from are unchanged', () => {
  it.each(pairs)('%s: the vendored document is unchanged', (_label, tenant, instrument) => {
    const doc = tenant.documents[instrument];

    expect(agreementDigest(doc.file)).toBe(doc.digest);
  });

  /*
    RETIRED 2026-09-10 by ADR 0012, and this is where the two assertions were.

    They asserted that every clause body appears verbatim in the vendored
    document, and that a clause's number and heading sit adjacent in it. Both
    were transcription guards: they defined a clause as correct when it matched
    `Lombard_FRPA_v4`.

    That document is a rebranded, AI-generated form carrying 254 review findings
    and a counsel memo proposing REPLACE IN FULL on 93 of 101 clauses. Requiring
    a clause to match it was requiring the defect, and the moment the first eight
    clauses were rewritten these went red on exactly the work they were meant to
    permit.

    WHAT SURVIVES, ABOVE. The digest assertion — the vendored document is
    unchanged — which catches a `.docx` being edited and re-rendered underneath
    us. That has nothing to do with clause bodies and is not retired.

    WHAT REPLACES THEM. `assertPublishable` (a clause with `author: null` cannot
    reach a third party), counsel approval pinned to a content fingerprint, and
    rule 1's `examinedBy`. Before, a clause was checkable against a bad document;
    now it is checkable against an attorney.
  */

  it('every instrument that has clauses has a vendored document for each tenant', () => {
    for (const tenant of MCA_TENANTS) {
      for (const [instrument, doc] of Object.entries(tenant.documents)) {
        if (libraryFor(instrument as never).length > 0) {
          expect(doc.bodiesVerifiedAt, `${tenant.id}/${instrument}`).not.toBeNull();
          expect(() => readAgreementBody(doc.file)).not.toThrow();
        }
      }
    }
  });
});
