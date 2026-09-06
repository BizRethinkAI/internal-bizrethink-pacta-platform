import { describe, expect, it } from 'vitest';
import type { ClauseSource } from '../../provenance/types';
import { assertPublishable } from '../../provenance/types';
import { publishableProblems } from '../provenance/verify';
import { CONTENT_STATUTES, MCA_DISCLOSURES, PRESCRIBED_FORMS } from '../registry';

/*
  INVARIANT 1 — nothing publishes without verified provenance.

  The MCA package shipped eleven states and imported nothing from
  `provenance/`, so `assertPublishable` had no opportunity to refuse anything.
  These tests are the wiring, and the negative controls below are the part that
  matters: each one constructs a spec that MUST be refused, so deleting the
  guard in `assertPublishable` turns this file red rather than leaving it
  vacuously green.
*/

describe('every MCA spec carries provenance', () => {
  it('has all eleven states', () => {
    expect(MCA_DISCLOSURES).toHaveLength(11);
  });

  it.each(MCA_DISCLOSURES.map((d) => [d.slug, d] as const))('%s carries a source and a status', (_slug, spec) => {
    expect(spec.source).toBeDefined();
    expect(spec.status).toBeDefined();
  });

  /*
    The two shapes carry different provenance kinds, and the difference is the
    whole point of the `regulator-prescribed-form` variant: a prescribed form
    fixes STRUCTURE as well as words, so it needs two dates where a
    content-only act needs one.
  */
  it.each(PRESCRIBED_FORMS.map((f) => [f.slug, f] as const))('%s is a regulator-prescribed form', (_slug, form) => {
    expect(form.source.kind).toBe('regulator-prescribed-form');
  });

  it.each(CONTENT_STATUTES.map((s) => [s.slug, s] as const))('%s is a statute', (_slug, statute) => {
    expect(statute.source.kind).toBe('statute');
  });

  /*
    The spec names its own citation and file, and so does its ClauseSource.
    Two records of the same fact drift; pinning them equal turns drift red.
  */
  it.each(PRESCRIBED_FORMS.map((f) => [f.slug, f] as const))('%s agrees with its own source record', (_slug, form) => {
    if (form.source.kind !== 'regulator-prescribed-form') {
      throw new Error('checked above');
    }

    expect(form.source.citation).toBe(form.citation);
    expect(form.source.sourceFile).toBe(form.sourceFile);
  });
});

describe('the gate actually refuses things', () => {
  it('passes every shipped spec', () => {
    expect(publishableProblems(MCA_DISCLOSURES)).toEqual([]);
  });

  /*
    NEGATIVE CONTROLS. A green assertion is evidence only if it could have been
    red — two assertions in this package once filtered on `Divergence` kinds
    that did not exist and passed vacuously for a day.
  */
  const CA = () => {
    const form = PRESCRIBED_FORMS.find((f) => f.slug === 'ca-offer-summary');

    if (!form) {
      throw new Error('ca-offer-summary is missing from the registry');
    }

    return form;
  };

  const withSource = (source: ClauseSource) => ({ ...CA(), source });

  it('refuses a prescribed form whose WORDS were never verified', () => {
    const spec = withSource({
      kind: 'regulator-prescribed-form',
      citation: '10 CCR §914',
      sourceFile: 'CA-10CCR-900-956.txt',
      verbatimVerifiedAt: null,
      structureVerifiedAt: '2026-09-06',
    });

    expect(assertPublishable(spec)).toEqual([
      'ca-offer-summary: regulator-prescribed text published without a verification date',
    ]);
    expect(publishableProblems([spec])).toHaveLength(1);
  });

  /*
    The two dates fail independently. A regulator can reorder the table while
    leaving every prescribed sentence alone, and a form that still matches the
    words is then not the prescribed form at all.
  */
  it('refuses a prescribed form whose STRUCTURE was never verified, though the words were', () => {
    const spec = withSource({
      kind: 'regulator-prescribed-form',
      citation: '10 CCR §914',
      sourceFile: 'CA-10CCR-900-956.txt',
      verbatimVerifiedAt: '2026-09-06',
      structureVerifiedAt: null,
    });

    expect(assertPublishable(spec)).toEqual([
      'ca-offer-summary: regulator-prescribed form published without a structure verification date',
    ]);
    expect(publishableProblems([spec])).toHaveLength(1);
  });

  it('reports both dates when neither is set', () => {
    const spec = withSource({
      kind: 'regulator-prescribed-form',
      citation: '10 CCR §914',
      sourceFile: 'CA-10CCR-900-956.txt',
      verbatimVerifiedAt: null,
      structureVerifiedAt: null,
    });

    expect(publishableProblems([spec])).toHaveLength(2);
  });

  it('refuses a statute with no verification date', () => {
    const spec = withSource({
      kind: 'statute',
      citation: 'Fla. Stat. §559.9613(2)',
      verbatimRequired: false,
      verbatimVerifiedAt: null,
    });

    expect(publishableProblems([spec])).toHaveLength(1);
  });

  /*
    Case-law positions and anything else we reason our way to are
    `attorney-drafted` with a null author, and stay unpublishable until counsel
    signs. Never launder our own judgement into authority.
  */
  it('refuses attorney-drafted text with no named reviewer', () => {
    expect(publishableProblems([withSource({ kind: 'attorney-drafted', author: null })])).toHaveLength(1);
  });

  it('lets a draft through, because the gate is about publishing', () => {
    const draft = {
      ...withSource({
        kind: 'regulator-prescribed-form',
        citation: '10 CCR §914',
        sourceFile: 'CA-10CCR-900-956.txt',
        verbatimVerifiedAt: null,
        structureVerifiedAt: null,
      }),
      status: 'draft' as const,
    };

    expect(publishableProblems([draft])).toEqual([]);
  });
});
