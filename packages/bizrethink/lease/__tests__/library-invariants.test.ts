import { describe, expect, it } from 'vitest';
import { assertPublishable } from '../clauses/types';
import { FL_CLAUSE_MODULES, FL_LIBRARY, FL_SECTION_ORDER } from '../clauses/us-fl';

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
    const missing = Object.entries(FL_CLAUSE_MODULES).flatMap(([moduleName, clauses]) =>
      clauses.filter((c) => !FL_LIBRARY.includes(c)).map((c) => `${moduleName}: ${c.slug}`),
    );

    expect(missing).toEqual([]);
  });

  it('contains nothing that is not in a module', () => {
    const known = new Set(Object.values(FL_CLAUSE_MODULES).flat());

    expect(FL_LIBRARY.filter((c) => !known.has(c))).toEqual([]);
  });
});

describe('structural invariants', () => {
  it('gives every clause a unique slug', () => {
    const seen = new Map<string, number>();

    for (const clause of FL_LIBRARY) {
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
    const orphans = FL_LIBRARY.filter((c) => !FL_SECTION_ORDER.includes(c.section as never)).map((c) => c.slug);

    expect(orphans).toEqual([]);
  });

  it('only supersedes clauses that exist', () => {
    const slugs = new Set(FL_LIBRARY.map((c) => c.slug));

    const dangling = FL_LIBRARY.flatMap((c) =>
      c.supersedes.filter((target) => !slugs.has(target)).map((target) => `${c.slug} -> ${target}`),
    );

    expect(dangling).toEqual([]);
  });

  it('never supersedes itself', () => {
    expect(FL_LIBRARY.filter((c) => c.supersedes.includes(c.slug)).map((c) => c.slug)).toEqual([]);
  });

  it('declares every variable its body interpolates', () => {
    // A body referencing {{foo}} with no matching variable renders the raw
    // token into a signed lease.
    const problems: string[] = [];

    for (const clause of FL_LIBRARY) {
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
    const problems = FL_LIBRARY.flatMap((clause) =>
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
    expect(FL_LIBRARY.filter((c) => c.status === 'published')).toEqual([]);
    expect(FL_LIBRARY.flatMap(assertPublishable)).toEqual([]);
  });

  /*
    THE CLAUSE LIBRARY IS FLORIDA LAW, NOT ONE PROPERTY.

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
    30/60 days from §83.575, 15 from §83.49(3)(a), 3/7 from §83.56. That is not
    a rule imposed on the library; it is the rule the library already followed.
  */
  it('cites only law, and cites exactly what is pinned here', () => {
    const cited = Object.fromEntries(FL_LIBRARY.filter((c) => c.requiredBy).map((c) => [c.slug, c.requiredBy]));

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
    const hoaClauses = FL_LIBRARY.filter((c) => c.slug.startsWith('hoa.'));

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
    expect(FL_LIBRARY.filter((c) => c.source.kind === 'customer-authored').map((c) => c.slug)).toEqual([]);
  });
});
