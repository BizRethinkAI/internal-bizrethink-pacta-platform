import { describe, expect, it } from 'vitest';

import { buildClauseDraftPrompt, parseClauseDraft } from '../ai/clause-draft';

/**
 * Turning plain English into a clause the landlord can edit.
 *
 * This is the work that was done by hand for the six lettered clauses the 2026
 * Zillow lease buried in a free-text box under a heading reading "N/A".
 *
 * THE MODEL PROPOSES INTO AN EDITOR. It never inserts, never blocks, and never
 * concludes. A false "this clause is fine" manufactures confidence and is
 * worse than no help at all, so the output is a typed shape with nowhere to
 * put a legal conclusion — no `enforceable` field, no `compliant` field, no
 * severity — and anything that smuggles one into the prose is rejected rather
 * than shown.
 *
 * Everything asserted here runs without a network. The parse is where the
 * safety lives; the HTTP call is a thin shell around it.
 */

const good = JSON.stringify({
  heading: 'Pool Equipment Replacement',
  body: "Landlord shall replace the pool pump and filtration equipment at Landlord's expense when it fails in ordinary use.",
  section: 'maintenance',
  asserts: [],
});

describe('parseClauseDraft', () => {
  it('accepts a well-formed draft', () => {
    const result = parseClauseDraft(good, { sections: ['maintenance', 'general'] });

    expect(result.ok).toBe(true);
    expect(result.ok && result.draft.heading).toBe('Pool Equipment Replacement');
  });

  it('always marks the draft as the landlord’s own, never library text', () => {
    const result = parseClauseDraft(good, { sections: ['maintenance'] });

    // It has been through no attorney review and must never be mistaken for a
    // clause that has.
    expect(result.ok && result.draft.origin).toBe('ai-drafted');
  });

  it('survives a model that wraps its JSON in a code fence', () => {
    const fenced = `Here you go:\n\`\`\`json\n${good}\n\`\`\``;

    expect(parseClauseDraft(fenced, { sections: ['maintenance'] }).ok).toBe(true);
  });

  it('rejects anything that is not JSON at all', () => {
    expect(parseClauseDraft('I cannot help with that.', { sections: ['maintenance'] }).ok).toBe(false);
  });

  it('rejects a section the engine does not know', () => {
    // A section that fails later would put the clause nowhere, silently.
    const wrong = JSON.stringify({ ...JSON.parse(good), section: 'invented-section' });

    expect(parseClauseDraft(wrong, { sections: ['maintenance'] }).ok).toBe(false);
  });

  it('rejects an empty heading or body', () => {
    expect(parseClauseDraft(JSON.stringify({ ...JSON.parse(good), body: '' }), { sections: ['maintenance'] }).ok).toBe(
      false,
    );
    expect(
      parseClauseDraft(JSON.stringify({ ...JSON.parse(good), heading: '   ' }), { sections: ['maintenance'] }).ok,
    ).toBe(false);
  });
});

describe('the model may not offer a legal conclusion', () => {
  const withBody = (body: string) => JSON.stringify({ ...JSON.parse(good), body });

  it('rejects a draft that says the clause is enforceable', () => {
    const result = parseClauseDraft(withBody('This provision is enforceable under Florida law.'), {
      sections: ['maintenance'],
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.toLowerCase()).toMatch(/conclusion|advice/);
  });

  it('rejects a draft claiming compliance with a statute', () => {
    expect(
      parseClauseDraft(withBody('This clause complies with Fla. Stat. §83.51 in all respects.'), {
        sections: ['maintenance'],
      }).ok,
    ).toBe(false);
  });

  it('rejects advice phrasing', () => {
    expect(
      parseClauseDraft(withBody('You should keep the pool serviced monthly.'), { sections: ['maintenance'] }).ok,
    ).toBe(false);
  });

  it('rejects a draft asserting something is unenforceable', () => {
    expect(
      parseClauseDraft(withBody('Any contrary agreement is unenforceable.'), { sections: ['maintenance'] }).ok,
    ).toBe(false);
  });

  it('allows ordinary clause language that merely mentions a statute', () => {
    // Citing a statute is not concluding anything about this clause. A lease
    // that could not name a statute would be a poor lease.
    const result = parseClauseDraft(
      withBody('Landlord shall maintain the pool as required by Fla. Stat. §83.51(2)(a).'),
      { sections: ['maintenance'] },
    );

    expect(result.ok).toBe(true);
  });

  it('has nowhere in its shape to put a verdict', () => {
    const smuggled = JSON.stringify({ ...JSON.parse(good), enforceable: true, risk: 'low' });
    const result = parseClauseDraft(smuggled, { sections: ['maintenance'] });

    // Extra keys are dropped rather than carried through to the UI.
    expect(result.ok).toBe(true);
    expect(result.ok && Object.keys(result.draft).sort()).toEqual(
      ['asserts', 'body', 'heading', 'origin', 'section'].sort(),
    );
  });
});

describe('buildClauseDraftPrompt', () => {
  const prompt = buildClauseDraftPrompt({
    request: 'tenant handles repairs under $150, I cover A/C but they change filters monthly',
    sections: ['maintenance', 'general'],
    jurisdiction: 'US-FL',
  });

  it('passes the landlord’s own words through', () => {
    expect(prompt).toContain('tenant handles repairs under $150');
  });

  it('names the sections it is allowed to choose from', () => {
    expect(prompt).toContain('maintenance');
    expect(prompt).toContain('general');
  });

  it('tells the model it is drafting for Florida', () => {
    expect(prompt).toContain('US-FL');
  });

  it('forbids a legal conclusion in the instructions, not only in the parse', () => {
    // Defence in depth: the parse rejects one, but a model told plainly is a
    // model that mostly does not produce one.
    expect(prompt.toLowerCase()).toMatch(/do not.*(conclusion|advice|enforceab)/s);
  });

  it('demands JSON only, so the parse has something to work with', () => {
    expect(prompt.toLowerCase()).toContain('json');
  });
});
