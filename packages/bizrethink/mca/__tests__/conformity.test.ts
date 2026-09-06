import { describe, expect, it } from 'vitest';
import { checkAgainstSource, checkFormConformity } from '../prescribed/conformity';
import type { PrescribedForm, RenderedRow } from '../prescribed/types';

/*
  Two different questions, and the second is the one that matters most.

  `checkFormConformity` asks whether a form we built matches the spec we wrote.
  `checkAgainstSource` asks whether the SPEC matches the statute — which is the
  check that would have caught the Georgia and Texas defects, where the form
  faithfully implemented a spec derived from a secondary summary that was itself
  wrong. A library that only does the first check is a very tidy way of being
  confidently incorrect.
*/

const CA_SOURCE = `
   (2) The second row of the table shall include only the following information:
            (A) In the first column: "Funding Provided".
            (C) In the third column: "This is how much funding [name of financer]
                will provide."
   (3) The third row of the table shall include only the following information:
            (A) In first column: "Finance Charge".
`;

const form: PrescribedForm = {
  slug: 'ca-test',
  citation: '10 CCR §914',
  sourceFile: 'CA-DFPI-PRO-01-18.txt',
  rows: [
    {
      label: 'Funding Provided',
      verbatim: 'This is how much funding [name of financer] will provide.',
      onlyPrescribedContent: true,
    },
    { label: 'Finance Charge', verbatim: null, onlyPrescribedContent: false },
  ],
};

describe('checkFormConformity', () => {
  const rendered = (over: Partial<RenderedRow>[] = []): RenderedRow[] =>
    [
      { label: 'Funding Provided', content: 'This is how much funding Lombard Capital LLC will provide.' },
      { label: 'Finance Charge', content: 'This is the dollar cost of your financing.' },
    ].map((r, i) => ({ ...r, ...(over[i] ?? {}) }));

  it('passes a form that matches the spec', () => {
    expect(checkFormConformity(form, rendered())).toEqual([]);
  });

  it('catches a wrong row count', () => {
    const out = checkFormConformity(form, rendered().slice(0, 1));
    expect(out.map((d) => d.kind)).toContain('row-count');
  });

  it('catches an altered label', () => {
    const out = checkFormConformity(form, rendered([{ label: 'Funding provided' }]));
    expect(out.map((d) => d.kind)).toContain('label');
  });

  it('catches altered verbatim text', () => {
    // the real one: NY says "finance charges you pay" where CA says "fees you
    // pay", and a session tidying them into agreement breaks one of them
    const out = checkFormConformity(form, rendered([
      { content: 'This is how much funding Lombard Capital LLC provides.' },
    ]));
    expect(out.map((d) => d.kind)).toContain('verbatim');
  });

  it('catches an addition to a shall-include-only row', () => {
    const out = checkFormConformity(form, rendered([
      {
        content:
          'This is how much funding Lombard Capital LLC will provide. Actual collection varies with your daily sales volume.',
      },
    ]));
    expect(out.map((d) => d.kind)).toContain('unauthorised-addition');
  });

  it('allows extra content in a row the regulation does not close', () => {
    const out = checkFormConformity(form, rendered([{}, { content: 'Anything at all.' }]));
    expect(out).toEqual([]);
  });
});

describe('checkAgainstSource', () => {
  it('passes a spec whose text is in the statute', () => {
    expect(checkAgainstSource(form, CA_SOURCE)).toEqual([]);
  });

  it('catches a label the statute does not contain', () => {
    const invented: PrescribedForm = {
      ...form,
      rows: [{ ...form.rows[0], label: 'Total Funds Provided' }, form.rows[1]],
    };
    const out = checkAgainstSource(invented, CA_SOURCE);
    expect(out.map((d) => d.kind)).toEqual(['not-in-source']);
    expect(out[0].detail).toContain('Total Funds Provided');
  });

  it('catches prescribed text the statute does not contain', () => {
    const invented: PrescribedForm = {
      ...form,
      rows: [
        { ...form.rows[0], verbatim: 'This is how much funding we will advance to you.' },
        form.rows[1],
      ],
    };
    expect(checkAgainstSource(invented, CA_SOURCE).map((d) => d.kind)).toEqual(['not-in-source']);
  });

  it('ignores whitespace and line wrapping in the statute', () => {
    // vendored statutes are pdftotext output; a prescribed sentence is routinely
    // split across lines with runs of spaces, so a naive includes() finds nothing
    expect(checkAgainstSource(form, CA_SOURCE)).toEqual([]);
  });
});
