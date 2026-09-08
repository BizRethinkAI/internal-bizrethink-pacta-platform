import { describe, expect, it } from 'vitest';

import { agreementDigest, containsClauseText, readAgreementBody } from '../documents';
import { ALL_MCA_CLAUSES, libraryFor } from '../library';
import { MCA_TENANTS, type McaTenant, resolveParties } from '../parties';

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

describe('every clause body is still in the document it was taken from', () => {
  it.each(pairs)('%s: the vendored document is unchanged', (_label, tenant, instrument) => {
    const doc = tenant.documents[instrument];

    expect(agreementDigest(doc.file)).toBe(doc.digest);
  });

  it.each(
    MCA_TENANTS.flatMap((tenant) =>
      ALL_MCA_CLAUSES.filter((clause) => tenant.documents[clause.instrument]?.bodiesVerifiedAt !== null).map(
        (clause) => [`${tenant.id}/${clause.slug}`, tenant, clause] as const,
      ),
    ),
  )('%s', (_label, tenant, clause) => {
    const body = readAgreementBody(tenant.documents[clause.instrument].file);

    expect(containsClauseText(body, resolveParties(clause.heading, tenant))).toBe(true);
    expect(containsClauseText(body, resolveParties(clause.body, tenant))).toBe(true);
  });

  /**
   * The number the document prints, checked beside the heading rather than
   * instead of it.
   *
   * REVIEW-01's finding loci name `§A.5 Clawback Provision`; the shipped v2
   * numbers that clause A.4, because the fixes that review produced removed a
   * section above it. A clause cannot be identified by its number alone across
   * time, and this asserts only that the number and the heading are adjacent in
   * the document TODAY.
   *
   * THE CORPUS PUNCTUATES ITS NUMBERING TWO WAYS, and neither is wrong. The FRPA
   * prints "2.1 Sales of Receipts; Not a Loan"; the Permission to Release prints
   * "1. Trade, Landlord, and Bank Information." `number` holds the number and
   * not the punctuation around it, so both forms are accepted rather than a dot
   * being written into six clause records to satisfy one assertion.
   */
  it.each(
    MCA_TENANTS.flatMap((tenant) =>
      ALL_MCA_CLAUSES.filter((clause) => tenant.documents[clause.instrument]?.bodiesVerifiedAt !== null).map(
        (clause) => [`${tenant.id}/${clause.slug}`, tenant, clause] as const,
      ),
    ),
  )('%s prints its number beside its heading', (_label, tenant, clause) => {
    const body = readAgreementBody(tenant.documents[clause.instrument].file);
    const heading = resolveParties(clause.heading, tenant);

    expect(
      containsClauseText(body, `${clause.number} ${heading}`) ||
        containsClauseText(body, `${clause.number}. ${heading}.`),
    ).toBe(true);
  });

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
