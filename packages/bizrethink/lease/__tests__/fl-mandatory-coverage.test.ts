import { describe, expect, it } from 'vitest';
import type { ClauseFacts } from '../clauses/types';
import { FL_LIBRARY } from '../clauses/us-fl';
import { selectClauses } from '../engine/select-clauses';
import { PICANA_FACTS } from '../matters/picana-ln';

/**
 * Every disclosure Florida makes mandatory must actually appear in the
 * document. Nothing else tested this.
 *
 * The coverage test in interview.test.ts asks whether every declared variable
 * gets a value — it says nothing about whether a required CLAUSE exists at all.
 * An adversarial review on 2026-08-29 found four gaps that all passed every
 * existing test, because they were absences: a §83.49(3) notice whose body was
 * still a placeholder token, no §83.575 non-renewal provision, no §83.49(2)
 * 30-day escrow notice, and an email-notice clause that granted what §83.505
 * conditions on a separate signed addendum.
 *
 * Absence is this repo's characteristic failure. This is the guard for it.
 */

const facts = (overrides: Partial<ClauseFacts> = {}): ClauseFacts => ({ ...PICANA_FACTS, ...overrides });

const documentFor = (f: ClauseFacts) => {
  const result = selectClauses({ facts: f, library: FL_LIBRARY });

  return [...result.selected, ...result.addenda, ...result.standaloneDisclosures];
};

/**
 * Slug plus the condition under which Florida compels it. `always` means every
 * residential lease in the state.
 */
const MANDATORY: { slug: string; cite: string; when: (f: ClauseFacts) => boolean }[] = [
  { slug: 'disclosure.radon', cite: 'Fla. Stat. §404.056(5)', when: () => true },
  { slug: 'disclosure.landlord-identity', cite: 'Fla. Stat. §83.50', when: () => true },
  { slug: 'maintenance.landlord-statutory', cite: 'Fla. Stat. §83.51(1)', when: () => true },
  { slug: 'default.statutory-notices', cite: 'Fla. Stat. §83.56', when: () => true },
  { slug: 'disclosure.flood', cite: 'Fla. Stat. §83.512', when: (f) => f.termMonths >= 12 },
  { slug: 'deposit.statutory-notice', cite: 'Fla. Stat. §83.49(3)', when: (f) => f.depositHeldUsd > 0 },
  { slug: 'deposit.escrow-notice', cite: 'Fla. Stat. §83.49(2)', when: (f) => f.depositHeldUsd > 0 },
  {
    slug: 'disclosure.lead-paint',
    cite: '42 U.S.C. §4852d',
    when: (f) => f.propertyYearBuilt === null || f.propertyYearBuilt < 1978,
  },
];

describe('every mandatory Florida disclosure reaches the document', () => {
  for (const { slug, cite } of MANDATORY) {
    it(`includes ${slug} (${cite}) whenever it is required`, () => {
      const required = MANDATORY.find((m) => m.slug === slug)!;

      // Try a spread of fact combinations; wherever the condition holds, the
      // clause must be in the document.
      const combinations: ClauseFacts[] = [
        facts(),
        facts({ termMonths: 6 }),
        facts({ propertyYearBuilt: 1960 }),
        facts({ propertyYearBuilt: null }),
        facts({ depositHeldUsd: 0, depositCarriedInUsd: 0 }),
        facts({ propertyType: 'condo' }),
        facts({ petsPermitted: false, hasPool: false, hasHoa: false }),
      ];

      for (const combination of combinations) {
        if (!required.when(combination)) {
          continue;
        }

        expect(
          documentFor(combination).map((c) => c.slug),
          `${slug} is required by ${cite} for these facts and is missing from the document`,
        ).toContain(slug);
      }
    });
  }
});

describe('no mandatory clause ships a placeholder body', () => {
  it('has real text in every clause the statute compels', () => {
    const placeholders = FL_LIBRARY.filter(
      (clause) => clause.requiredBy !== undefined && /PENDING|TODO|TBD|XXX/i.test(clause.body),
    ).map((clause) => `${clause.slug}: ${clause.body.slice(0, 60)}`);

    expect(
      placeholders,
      'A statutorily mandated clause whose body is a placeholder puts an invented string where ' +
        'the statute requires prescribed text.',
    ).toEqual([]);
  });
});

describe('electronic notice — Fla. Stat. §83.505', () => {
  it('does not grant email delivery of notices without the addendum', () => {
    /*
      §83.505 permits electronic delivery of statutory notices ONLY where the
      parties signed a separate addendum in substantially the prescribed form.
      A lease clause that simply declares email valid grants something the
      statute conditions — worse than an omission, because a tenant may rely
      on it.
    */
    const notices = FL_LIBRARY.find((c) => c.slug === 'notices.method');

    expect(notices).toBeDefined();

    const grantsEmailUnconditionally =
      /sent by e-?mail/i.test(notices?.body ?? '') && !/83\.505/.test(notices?.body ?? '');

    expect(
      grantsEmailUnconditionally,
      'notices.method allows email without referencing the §83.505 addendum that makes it lawful.',
    ).toBe(false);
  });

  it('offers the addendum as its own signed document when elected', () => {
    const addendum = FL_LIBRARY.find((c) => c.slug === 'notices.electronic-delivery');

    expect(addendum, '§83.505 requires a separate addendum; none exists in the library.').toBeDefined();
    expect(addendum?.placement).toBe('addendum');
  });
});

describe('non-renewal notice — Fla. Stat. §83.575', () => {
  it('exists as a clause', () => {
    expect(
      FL_LIBRARY.find((c) => c.slug === 'term.non-renewal-notice'),
      'A lease may require notice before vacating at term end, but only within the bounds ' +
        '§83.575 sets. No clause covers it.',
    ).toBeDefined();
  });

  it('obliges the landlord reciprocally, which is what makes it enforceable', () => {
    const clause = FL_LIBRARY.find((c) => c.slug === 'term.non-renewal-notice');

    // §83.575(1): the tenant-notice requirement is only permitted "if such
    // provision also requires the landlord to notify the tenant".
    expect(clause?.body.toLowerCase()).toContain('landlord');
    expect(clause?.requiredBy ?? clause?.body).toMatch(/83\.575/);
  });
});
