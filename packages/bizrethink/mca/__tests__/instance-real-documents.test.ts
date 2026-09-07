import { describe, expect, it } from 'vitest';
import { conventionFromPaymentTerms, parseUsd, readEnvelope } from '../instance/adapters/lombard-form-values';
import { checkDisclosureInstance, instanceCoverage } from '../instance/check';
import caRows from './ca-rows.fixture.json';
import caDisclosure from './lombard-ca-disclosure.as-reviewed.fixture.json';
import frpa from './lombard-frpa.as-reviewed.fixture.json';
import nyDisclosure from './lombard-ny-disclosure.as-reviewed.fixture.json';

/*
  The real documents, unaltered.

  A spec that never meets a real document verifies nothing, so these fixtures
  are lombard-contracts/sample-data verbatim rather than figures typed into a
  test. They are the only populated instances of these templates that exist, and
  they are the ones REVIEW-01 examined.

  Everything below runs through the tenant adapter, which is the only file in
  this package that knows a field is called `funding_provided`.
*/

/*
  The convention is read out of the rendered form's own Payment Terms row rather
  than assumed — §914(a)(7)(B)(i) puts it there. The row in `ca-rows.fixture`
  reads "Each business day, your Approved Processor will remit «8»% of your
  gross daily credit and debit card receipts…".
*/
const paymentTermsRow = caRows.find((r) => r.label === 'Payment Terms');
const convention = conventionFromPaymentTerms(paymentTermsRow?.content ?? '');

const options = {
  paymentDayConvention: convention,
  // 150 × $496.66 is the purchased amount, so the figure was evidently produced
  // as a payment count. See `UNRESOLVED_READINGS.term-unit`.
  termUnit: 'payment-days' as const,
};

describe('the adapter reads what the documents actually say', () => {
  it('parses money without float drift', () => {
    expect(parseUsd('$50,000.00', 't')).toBe(5_000_000);
    expect(parseUsd('$496.66', 't')).toBe(49_666);
    expect(parseUsd('$0.00', 't')).toBe(0);
    expect(() => parseUsd('N/A', 't')).toThrow();
    expect(() => parseUsd(undefined, 't')).toThrow();
  });

  it('reads the payment-day convention off the Payment Terms row', () => {
    expect(convention).toBe('business-days');
  });
});

describe('California — sample-data/ca-disclosure.json against sample-data/frpa.json', () => {
  const env = readEnvelope({
    jurisdiction: 'CA',
    offerSummary: caDisclosure.formValues,
    contract: frpa.formValues,
    options,
  });

  it('reads the three disclosed figures the blockers are about', () => {
    expect(env.offerSummary.amountFinanced).toBe(5_000_000);
    expect(env.offerSummary.financeCharge).toBe(2_450_000);
    expect(env.offerSummary.estimatedApr).toBeCloseTo(0.674, 12);
  });

  it('reads the agreement’s two withheld fees as prepaid finance charges', () => {
    expect(env.contract?.feesWithheldAtFunding).toEqual([
      { label: 'Origination Fee', amount: 250_000 },
      { label: 'ACH Program Fee', amount: 39_500 },
    ]);
  });

  it('rejects it on all three blockers', () => {
    const kinds = checkDisclosureInstance(env).findings.map((f) => f.kind);

    expect(kinds).toContain('amount-financed-mismatch');
    expect(kinds).toContain('finance-charge-mismatch');
    expect(kinds).toContain('apr-below-calculated');
  });

  it('with the agreement in the envelope, nothing about the three is undetectable', () => {
    expect(instanceCoverage(env).undetectableInThisEnvelope).toEqual([]);
  });

  it('finds four further defects REVIEW-01 did not record against these numbers', () => {
    const kinds = checkDisclosureInstance(env).findings.map((f) => f.kind);

    // The fourth row is $71,605 where the amount financed plus the finance
    // charge is $74,500 — the purchased amount the merchant actually repays.
    expect(kinds).toContain('closure-mismatch');
    // $496.66 × 150 is $74,499, not the $71,605 the fourth row states.
    expect(kinds).toContain('stream-does-not-close');
    // Row 1 puts the amount financed above recipient funds, which §956(a)
    // makes an Itemization mandatory for. There is no Itemization sample.
    expect(kinds).toContain('itemization-required');
    // The Estimated Monthly Cost cell is required on a daily product and blank.
    expect(kinds).toContain('missing-required-figure');
  });

  it('reports the payment as irreconcilable with the income the APR row states', () => {
    const found = checkDisclosureInstance(env).findings.find((f) => f.kind === 'payment-contradicts-projection');

    // $496.66 a business day is ~$10,784 a month; at the disclosed 15% split
    // that implies ~$71,900 of monthly card income, not $15,000.
    expect(found?.severity).toBe('undetermined');
    expect(found?.detail).toContain('$15,000.00');
  });
});

describe('New York — sample-data/ny-disclosure.json', () => {
  const env = readEnvelope({
    jurisdiction: 'NY',
    offerSummary: nyDisclosure.formValues,
    contract: frpa.formValues,
    options,
  });

  it('carries the same figures as California’s, and fails the same way', () => {
    expect(nyDisclosure.formValues).toEqual(caDisclosure.formValues);

    const kinds = checkDisclosureInstance(env).findings.map((f) => f.kind);

    expect(kinds).toContain('amount-financed-mismatch');
    expect(kinds).toContain('finance-charge-mismatch');
    expect(kinds).toContain('apr-below-calculated');
  });

  it('cites New York for every one of them', () => {
    for (const f of checkDisclosureInstance(env).findings) {
      for (const a of f.authorities) {
        expect(a.jurisdiction).toBe('NY');
      }
    }
  });
});
