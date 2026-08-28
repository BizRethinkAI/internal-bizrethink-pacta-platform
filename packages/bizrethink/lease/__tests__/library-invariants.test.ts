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

  it('cites a statute on every clause that claims to be compelled by one', () => {
    const uncited = FL_LIBRARY.filter((c) => c.requiredBy !== undefined).filter(
      (c) => !/(Fla\. Stat\.|U\.S\.C\.)/.test(c.requiredBy!),
    );

    expect(uncited.map((c) => c.slug)).toEqual([]);
  });

  it('never carries customer-authored text in the shared library', () => {
    expect(FL_LIBRARY.filter((c) => c.source.kind === 'customer-authored').map((c) => c.slug)).toEqual([]);
  });
});
