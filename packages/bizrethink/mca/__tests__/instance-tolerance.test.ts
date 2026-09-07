import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { permittedCalculatedBand, TOLERANCE_RULES } from '../instance/tolerance';

/*
  The tolerance is the one place where California and New York DIVERGE, and the
  computation spec says they do not.

  DISCLOSURE-COMPUTATION-SPEC.md: "California and New York define these terms in
  identical words, so one spec serves both forms. Where they differ, it is
  called out." It then states, under "The tolerance is one-sided", that
  "Nothing in §955 forgives a disclosed rate above the calculated one."

  That is true of 10 CCR §955(a)(1)-(2), which say "below". It is NOT true of
  23 NYCRR §600.4(a)(1)-(2), which say "above or below". The difference is not
  called out anywhere, and a single shared tolerance function is how one state's
  rule reaches the other state's document.

  These tests pin each rule to its OWN vendored source file.
*/

const SOURCES = join(__dirname, '../sources');
const text = (f: string) => readFileSync(join(SOURCES, f), 'utf8').replace(/\s+/g, ' ');

describe('the tolerance rule is per-jurisdiction and quoted from that jurisdiction only', () => {
  it("quotes text that actually appears in that state's vendored source", () => {
    for (const rule of Object.values(TOLERANCE_RULES)) {
      const source = text(rule.sourceFile);

      for (const quote of rule.quotes) {
        expect(
          source.includes(quote.text.replace(/\s+/g, ' ')),
          `${rule.jurisdiction} ${quote.citation}: quoted text not found in ${rule.sourceFile}`,
        ).toBe(true);
      }
    }
  });

  it('never cites the other state', () => {
    expect(TOLERANCE_RULES.CA.sourceFile).toBe('CA-10CCR-900-956.txt');
    expect(TOLERANCE_RULES.NY.sourceFile).toBe('NY-23NYCRR-600.txt');
    expect(TOLERANCE_RULES.CA.quotes.every((q) => !/NYCRR/i.test(q.citation))).toBe(true);
    expect(TOLERANCE_RULES.NY.quotes.every((q) => !/CCR/.test(q.citation))).toBe(true);
  });

  it('records California as one-sided and New York as two-sided', () => {
    expect(TOLERANCE_RULES.CA.forgivesOverstatement).toBe(false);
    expect(TOLERANCE_RULES.NY.forgivesOverstatement).toBe(true);
  });
});

describe('permittedCalculatedBand — the range of TRUE rates a disclosed rate may stand for', () => {
  /*
    Stated as a band on the CALCULATED rate rather than on the disclosed one,
    because that is the direction the check runs: the document carries the
    disclosed figure, and the question is which true rates it is accurate for.
  */
  const disclosed = 0.674;

  it('California permits the calculated rate to sit ABOVE the disclosed one only', () => {
    const band = permittedCalculatedBand(TOLERANCE_RULES.CA, disclosed, 'irregular');

    // 1/4 point = 0.0025; 2.5% relative = 0.01685. The larger governs.
    expect(band.min).toBeCloseTo(disclosed, 12);
    expect(band.max).toBeCloseTo(disclosed + 0.025 * disclosed, 12);
  });

  it('New York permits it on either side, by the same widened band', () => {
    const band = permittedCalculatedBand(TOLERANCE_RULES.NY, disclosed, 'irregular');

    // Not `disclosed - 0.0025`. §600.4(a)(1)-(2) say "above or below", so the
    // relative test in (a)(3) extends the band on both sides; using the bare
    // quarter point as the floor would be stricter than New York requires.
    expect(band.min).toBeCloseTo(disclosed - 0.025 * disclosed, 12);
    expect(band.max).toBeCloseTo(disclosed + 0.025 * disclosed, 12);
  });

  it('uses the 1/8 point band on a regular transaction and 1/4 on an irregular one', () => {
    // At a small disclosed rate the point bands govern rather than the relative test.
    const small = 0.02;

    expect(permittedCalculatedBand(TOLERANCE_RULES.CA, small, 'regular').max).toBeCloseTo(small + 0.00125, 12);
    expect(permittedCalculatedBand(TOLERANCE_RULES.CA, small, 'irregular').max).toBeCloseTo(small + 0.0025, 12);
    // And New York's floor moves with it.
    expect(permittedCalculatedBand(TOLERANCE_RULES.NY, small, 'regular').min).toBeCloseTo(small - 0.00125, 12);
    expect(permittedCalculatedBand(TOLERANCE_RULES.NY, small, 'irregular').min).toBeCloseTo(small - 0.0025, 12);
  });

  it('never lets California’s floor fall below the disclosed rate, at any size', () => {
    for (const d of [0.001, 0.05, 0.674, 1.715, 9]) {
      expect(permittedCalculatedBand(TOLERANCE_RULES.CA, d, 'irregular').min).toBe(d);
      expect(permittedCalculatedBand(TOLERANCE_RULES.CA, d, 'regular').min).toBe(d);
    }
  });
});
