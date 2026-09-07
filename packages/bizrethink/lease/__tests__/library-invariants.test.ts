import { describe, expect, it } from 'vitest';
import { ALL_CLAUSES } from '../clauses/library';
import { assertPublishable } from '../clauses/types';
import { FL_CLAUSE_MODULES, FL_SECTION_ORDER } from '../clauses/us-fl';
import { NC_CLAUSE_MODULES } from '../clauses/us-nc';

/*
  EVERY clause, of every jurisdiction. These invariants read the Florida
  module's export until North Carolina existed, at which point seventeen clauses would have been
  exempt from every one of them — unique slugs, section order, dangling
  supersedes, the pinned citations, the publish guard — with nothing red. That
  is this repo's characteristic failure, and it would have arrived in the same
  commit as the feature it was meant to guard.
*/
/*
  PREFIXED, because both states name a module `maintenance` and a plain spread
  silently drops one of them. Caught on the first run of this change: the merged
  map lost Florida's maintenance, boilerplate and use-and-remedies modules, and
  the "contains nothing that is not in a module" invariant then reported
  thirty-five perfectly good Florida clauses as orphans. A collision that
  removed clauses from the CHECK rather than from the library — quieter, and the
  same shape.
*/
const MODULES = Object.fromEntries([
  ...Object.entries(FL_CLAUSE_MODULES).map(([name, clauses]) => [`us-fl/${name}`, clauses] as const),
  ...Object.entries(NC_CLAUSE_MODULES).map(([name, clauses]) => [`us-nc/${name}`, clauses] as const),
]);

/**
 * Invariants across the whole library, rather than any one clause.
 *
 * The first of these exists because of a real miss: FL_BOILERPLATE was written,
 * imported, and then never added to the library array. It compiled cleanly,
 * `noUnusedLocals` is off so nothing flagged the unused import, every existing
 * test still passed, and seven clauses were simply absent from every lease. The
 * only symptom was a document that looked slightly short.
 */

describe('every clause module reaches the library', () => {
  it('contains every clause from every module', () => {
    const missing = Object.entries(MODULES).flatMap(([moduleName, clauses]) =>
      clauses.filter((c) => !ALL_CLAUSES.includes(c)).map((c) => `${moduleName}: ${c.slug}`),
    );

    expect(missing).toEqual([]);
  });

  it('contains nothing that is not in a module', () => {
    const known = new Set(Object.values(MODULES).flat());

    expect(ALL_CLAUSES.filter((c) => !known.has(c))).toEqual([]);
  });
});

describe('structural invariants', () => {
  it('gives every clause a unique slug', () => {
    const seen = new Map<string, number>();

    for (const clause of ALL_CLAUSES) {
      seen.set(clause.slug, (seen.get(clause.slug) ?? 0) + 1);
    }

    expect([...seen.entries()].filter(([, n]) => n > 1)).toEqual([]);
  });

  it('names a section that exists in the document order', () => {
    /*
      selectClauses throws on an unknown section, but only for a clause that
      actually gets selected — one behind a false includeWhen would sit in the
      library undetected until the day someone's answers selected it.
    */
    const orphans = ALL_CLAUSES.filter((c) => !FL_SECTION_ORDER.includes(c.section as never)).map((c) => c.slug);

    expect(orphans).toEqual([]);
  });

  it('only supersedes clauses that exist', () => {
    const slugs = new Set(ALL_CLAUSES.map((c) => c.slug));

    const dangling = ALL_CLAUSES.flatMap((c) =>
      c.supersedes.filter((target) => !slugs.has(target)).map((target) => `${c.slug} -> ${target}`),
    );

    expect(dangling).toEqual([]);
  });

  it('never supersedes itself', () => {
    expect(ALL_CLAUSES.filter((c) => c.supersedes.includes(c.slug)).map((c) => c.slug)).toEqual([]);
  });

  it('declares every variable its body interpolates', () => {
    // A body referencing {{foo}} with no matching variable renders the raw
    // token into a signed lease.
    const problems: string[] = [];

    for (const clause of ALL_CLAUSES) {
      const declared = new Set(clause.variables.map((v) => v.name));

      for (const match of clause.body.matchAll(/\{\{(\w+)\}\}/g)) {
        if (!declared.has(match[1])) {
          problems.push(`${clause.slug}: {{${match[1]}}} is not declared`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it('interpolates every variable it declares', () => {
    const problems = ALL_CLAUSES.flatMap((clause) =>
      clause.variables
        .filter((v) => !clause.body.includes(`{{${v.name}}}`))
        .map((v) => `${clause.slug}: ${v.name} is declared but never used`),
    );

    expect(problems).toEqual([]);
  });
});

describe('provenance invariants', () => {
  it('holds the entire library below published', () => {
    // Nothing has been through attorney review, so nothing may render for an
    // organisation that is not BizRethink-internal.
    expect(ALL_CLAUSES.filter((c) => c.status === 'published')).toEqual([]);
    expect(ALL_CLAUSES.flatMap(assertPublishable)).toEqual([]);
  });

  /*
    THE CLAUSE LIBRARY IS A STATE'S LAW, NOT ONE PROPERTY.

    Text may be fixed here only by a statute, a regulation, or a court-approved
    form. Anything fixed by a PRIVATE instrument — an HOA declaration, an
    association rule, one property's covenant — is data, and reaches the lease
    through a variable.

    This invariant existed and worked. It rejected two clauses carrying a Pasco
    County recording reference, and the response was to WIDEN IT to accept
    `Instr#` and `OR x/y` so they would pass, with a confident comment
    explaining that a recorded covenant compels too. The premise was true and
    the conclusion was wrong: a covenant compels the OWNER, not the LIBRARY.
    A guard was weakened to admit the thing it was built to catch.

    So it is no longer a regex. It is a pinned map, because a regex can be
    widened by whoever is inconvenienced by it and a pinned map cannot — adding
    any requiredBy forces an edit here, which forces the conversation.

    Every hard-coded figure elsewhere in this library traces to a statute:
    30/60 days from §83.575, 15 from §83.49(3)(a), 3/7 from §83.56, 10 from
    §42-3, 15 from §42-42(a)(5), 5%/10%/12%/15% from §42-46. That is not a rule
    imposed on the library; it is the rule the library already followed.
  */
  it('cites only law, and cites exactly what is pinned here', () => {
    const cited = Object.fromEntries(ALL_CLAUSES.filter((c) => c.requiredBy).map((c) => [c.slug, c.requiredBy]));

    expect(cited).toEqual({
      'deposit.escrow-notice': 'Fla. Stat. §83.49(2)',
      'deposit.return': 'Fla. Stat. §83.49(3)(a)',
      'deposit.statutory-notice': 'Fla. Stat. §83.49(2)(d)',
      'deposit.held': 'Fla. Stat. §83.49(2)',
      'deposit.held-carried': 'Fla. Stat. §83.49(2)',
      'disclosure.flood': 'Fla. Stat. §83.512',
      'disclosure.landlord-identity': 'Fla. Stat. §83.50',
      'disclosure.lead-paint': '42 U.S.C. §4852d',
      'disclosure.radon': 'Fla. Stat. §404.056(5)',
      'default.statutory-notices': 'Fla. Stat. §83.56',
      'access.entry': 'Fla. Stat. §83.53(2)',
      'hoa.cure': 'Fla. Stat. §720.305(1)',
      'maintenance.detectors': 'Fla. Stat. §83.51(2)(b)',
      'maintenance.landlord-statutory': 'Fla. Stat. §83.51(1)',
      'maintenance.pool-safety': 'Ch. 515, Fla. Stat.',
      'moveout.personal-property': 'Fla. Stat. §83.67(5)',
      'notices.electronic-delivery': 'Fla. Stat. §83.505',
      'term.non-renewal-notice': 'Fla. Stat. §83.575',
      'termination.early-election': 'Fla. Stat. §83.595(4)',

      /*
        North Carolina, read off ncleg.gov on 2026-09-06. Every one of these is
        `implements`, never `compelled` — Chapter 42 does not say a residential
        lease shall contain anything, and `north-carolina.test.ts` asserts that
        the only compelled clause in a North Carolina lease is the federal lead
        disclosure travelling in on the portable tier.
      */
      'deposit.held-nc': 'N.C. Gen. Stat. §42-50',
      'deposit.held-carried-nc': 'N.C. Gen. Stat. §42-50',
      'deposit.escrow-notice-nc': 'N.C. Gen. Stat. §42-50',
      'deposit.accounting-nc': 'N.C. Gen. Stat. §42-52',
      'maintenance.landlord-statutory-nc': 'N.C. Gen. Stat. §42-42(a)',
      'maintenance.detectors-nc': 'N.C. Gen. Stat. §42-42(a)(5)',
      'default.notices-nc': 'N.C. Gen. Stat. §42-3',
      'moveout.personal-property-nc': 'N.C. Gen. Stat. §42-25.7',
      'rent.late-fee-nc': 'N.C. Gen. Stat. §42-46(a)',
      'fees.litigation-nc': 'N.C. Gen. Stat. §42-46',
      'notices.landlord-address-nc': 'N.C. Gen. Stat. §42-42(a)(4)',
    });
  });

  /*
    The second tooth, and the one that would have caught "two parking spaces"
    without anybody knowing it came from Estancia.

    A clause selected merely because a property HAS an association cannot know
    what THAT association requires. Any figure it states is one declaration's,
    imposed on every other. Numbers in these clauses must arrive as variables.
  */
  it('states no bare quantity in a clause selected only by there being an association', () => {
    const hoaClauses = ALL_CLAUSES.filter((c) => c.slug.startsWith('hoa.'));

    expect(hoaClauses.length).toBeGreaterThan(0);

    const offenders = hoaClauses
      .filter((c) => {
        const withoutVars = c.body.replace(/\{\{[^}]*\}\}/g, '');
        const withoutCites = withoutVars.replace(/§\s*[0-9.()a-z]+/gi, '');

        return /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i.test(withoutCites);
      })
      .map((c) => c.slug);

    expect(offenders).toEqual([]);
  });

  it('never carries customer-authored text in the shared library', () => {
    expect(ALL_CLAUSES.filter((c) => c.source.kind === 'customer-authored').map((c) => c.slug)).toEqual([]);
  });
});
