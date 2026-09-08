import { describe, expect, it } from 'vitest';

import { INSTRUMENTS, MCA_INSTRUMENTS } from '../instruments';
import { ALL_MCA_CLAUSES } from '../library';
import { LOMBARD, PARTY_ROLES, type PartyRole, resolveParties } from '../parties';

/**
 * THE LIBRARY IS A PRODUCT, NOT ONE FUNDER'S PAPERWORK.
 *
 * This is the property the first import got wrong, and it got it wrong quietly:
 * every check passed while 22 clause bodies named `Lombard Pay LLC`, the
 * instrument was called `payzli-split-funding`, and `entity` sat on the library
 * record rather than on the tenant.
 *
 * The lease builder is the pattern and it does not make this mistake — 28 of its
 * 52 clause bodies carry `{{landlordNames}}`, `{{tenantNames}}`,
 * `{{propertyAddress}}`. A lease library tied to one property would be
 * pointless, and a clause library tied to one funder is pointless for the same
 * reason. Pacta already serves two MCA clients.
 *
 * WHY THE DRIFT HAPPENED, so it is not repeated. The lease clauses were
 * RE-AUTHORED from a requirements inventory of two executed leases — their prose
 * stayed with Zillow and First In's forms vendor, because it is copyrighted, and
 * re-authoring produced placeholders for free. The MCA documents are ours, so
 * verbatim import was available and taken, and the verification built on top of
 * it (`bodies-match-the-document`, the digests) then made verbatim look
 * mandatory. It never was. It is mandatory for the IMPORT, not for the library.
 *
 * The way out is the one `twins.ts` already uses: store the general form, and
 * ASSERT the relationship to the specific document rather than storing the
 * specific document. Verification gets stronger — a body now has to match a real
 * tenant's paper after substitution, and a second tenant checks it twice.
 */
describe('no clause names a tenant', () => {
  const TENANT_NAMES = /Lombard|Payzli/;

  it.each(
    ALL_MCA_CLAUSES.map((clause) => [clause.slug, clause] as const),
  )('%s names no party in its text', (_slug, clause) => {
    expect(clause.body).not.toMatch(TENANT_NAMES);
    expect(clause.heading).not.toMatch(TENANT_NAMES);
  });

  it('names no tenant in an instrument id, title or slug', () => {
    for (const id of MCA_INSTRUMENTS) {
      expect(id).not.toMatch(TENANT_NAMES);
      expect(INSTRUMENTS[id].title).not.toMatch(TENANT_NAMES);
    }

    for (const clause of ALL_MCA_CLAUSES) {
      expect(clause.slug).not.toMatch(TENANT_NAMES);
    }
  });

  /**
   * `entity` was a field on the instrument record — "Lombard Capital LLC" as a
   * property of the Future Receivables Purchase Agreement itself. It is a fact
   * about who is using the library, and it belongs on the tenant.
   */
  it('keeps no tenant fact on an instrument record', () => {
    for (const id of MCA_INSTRUMENTS) {
      expect(JSON.stringify(INSTRUMENTS[id])).not.toMatch(TENANT_NAMES);
    }
  });
});

describe('the party roles', () => {
  /**
   * Three roles, and they are three because the corpus has three — not because
   * three seemed like a good number. `Lombard Capital LLC` is the FRPA's Buyer;
   * `Lombard Pay LLC` is the equipment affiliate the FRPA cross-references four
   * times and the Equipment Lease contracts with; `Payzli` is the card
   * processor. Two different Lombard entities, which REVIEW-02 flagged as
   * barely documented — collapsing them into one placeholder would have hidden
   * that.
   */
  it('is exactly the roles the corpus uses', () => {
    expect([...PARTY_ROLES].sort()).toEqual(['equipmentAffiliate', 'funder', 'processor']);
  });

  it('every placeholder in a body is a declared role', () => {
    for (const clause of ALL_MCA_CLAUSES) {
      for (const [, name] of clause.body.matchAll(/\{\{(\w+)\}\}/g)) {
        expect(PARTY_ROLES, `${clause.slug} uses an undeclared placeholder: ${name}`).toContain(name as PartyRole);
      }
    }
  });

  it('a tenant supplies a value for every role', () => {
    for (const role of PARTY_ROLES) {
      expect(LOMBARD.parties[role].length).toBeGreaterThan(0);
    }
  });

  /**
   * The substitution is what the document check runs on, so it has to be exact:
   * every placeholder resolved, none left behind. A clause that still reads
   * `{{funder}}` after resolution would fail to match any document, which is the
   * loud failure; one that silently dropped a placeholder would match nothing
   * and look like a defect in the text, which is the quiet one.
   */
  it('resolves every placeholder for a tenant', () => {
    for (const clause of ALL_MCA_CLAUSES) {
      expect(resolveParties(clause.body, LOMBARD)).not.toMatch(/\{\{\w+\}\}/);
    }
  });
});
