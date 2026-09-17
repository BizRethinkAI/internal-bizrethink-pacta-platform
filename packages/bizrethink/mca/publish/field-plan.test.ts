import { describe, expect, it } from 'vitest';
import { fieldPlanFor, parityShortfall } from './field-plan';
import contract from './live-template-contract.json';
import { PRODUCED_INSTRUMENTS } from './recipient-contract';

/**
 * What a merchant-ready render has to put on the page, worked out once.
 *
 * Every live widget name ends up in exactly one of three places, and which one
 * it lands in is the whole parity question:
 *
 *   marked     the builder prints `«name»` and the injector puts a widget there
 *   printed    the builder KNOWS the value at publication and sets it in type,
 *              so there is no widget and the platform's value lands nowhere
 *   absent     the builder cannot produce it at all
 *
 * The second and third are both breaks, and they break differently. A printed
 * name is a deliberate difference — the funder's own address does not need to
 * be re-sent per deal — but the platform keeps sending it and nothing says so.
 * An absent name is a hole in the document.
 */

describe('every live widget lands in exactly one place', () => {
  it.each(PRODUCED_INSTRUMENTS)('%s partitions its template contract, losing nothing', (instrument) => {
    const plan = fieldPlanFor(instrument);
    const accounted = [
      ...plan.marked.map((f) => f.widget),
      ...plan.printed.map((f) => f.widget),
      ...plan.absent.map((f) => f.widget),
    ];

    expect(accounted.sort()).toEqual([...contract.instruments[instrument].widgets].sort());
  });

  it.each(PRODUCED_INSTRUMENTS)('%s puts no name in two places at once', (instrument) => {
    const plan = fieldPlanFor(instrument);
    const accounted = [
      ...plan.marked.map((f) => f.widget),
      ...plan.printed.map((f) => f.widget),
      ...plan.absent.map((f) => f.widget),
    ];

    expect(new Set(accounted).size).toBe(accounted.length);
  });
});

/**
 * THE PARITY NUMBER. Pinned so that closing a gap, or opening one, is a diff in
 * this file rather than a thing somebody has to go and measure again.
 *
 * Read `printed` and `absent` together: that is how many values the funder's
 * platform would send into a document produced by the builder today and have
 * go nowhere at all.
 */
describe('how far from parity, exactly', () => {
  it('counts what the builder can and cannot produce, per instrument', () => {
    const shortfall = Object.fromEntries(
      PRODUCED_INSTRUMENTS.map((instrument) => {
        const plan = fieldPlanFor(instrument);

        return [instrument, { marked: plan.marked.length, printed: plan.printed.length, absent: plan.absent.length }];
      }),
    );

    expect(shortfall).toEqual({
      frpa: { marked: 37, printed: 2, absent: 3 },
      'equipment-lease': { marked: 22, printed: 2, absent: 4 },
      subscription: { marked: 22, printed: 2, absent: 4 },
      'iso-pra': { marked: 6, printed: 2, absent: 1 },
      // Nothing printed here: the one provider fact this form names is absent
      // from the instrument rather than resolved at publication.
      'permission-to-release': { marked: 7, printed: 0, absent: 3 },
    });
  });

  it('reports the shortfall as the values a caller would lose', () => {
    expect(
      parityShortfall('frpa')
        .map((entry) => entry.widget)
        .sort(),
    ).toEqual([
      'guarantor_ssn',
      'merchant_primary_contact_title',
      'processor_name',
      'provider_address',
      'rollover_method',
    ]);
  });

  it('says why each one is lost, in words a reader can act on', () => {
    for (const entry of parityShortfall('frpa')) {
      expect(entry.why.length).toBeGreaterThan(20);
      expect(['printed', 'absent']).toContain(entry.kind);
    }
  });
});

describe('what a marked field carries to the renderer', () => {
  it('names the binding whose value fills it', () => {
    const plan = fieldPlanFor('frpa');
    const legalName = plan.marked.find((field) => field.widget === 'merchant_legal_name');

    expect(legalName?.binding).toBe('merchant.legalName');
  });

  /**
   * The injector refuses a marker it was not told to expect and an expected
   * name that never appears, so the renderer and the injector have to be
   * working from the same list. This is that list.
   */
  it('is exactly what the injector should be told to expect', () => {
    const plan = fieldPlanFor('iso-pra');

    expect(plan.expect.sort()).toEqual(plan.marked.map((field) => field.widget).sort());
  });
});

/**
 * Signer fields are Documenso's, not ours: `{{SIGNATURE, rN}}` tokens that
 * upstream turns into fields at upload. `rN` follows the published signing
 * order, because that is what the recipient rows on the template are.
 */
describe('the signer placeholders a page must print', () => {
  it.each(PRODUCED_INSTRUMENTS)('%s numbers its signers from one, in signing order', (instrument) => {
    const plan = fieldPlanFor(instrument);

    expect(plan.signers.map((signer) => signer.token)).toEqual(plan.signers.map((_, index) => `r${index + 1}`));
  });

  it('gives each signer a signature and a date token', () => {
    const plan = fieldPlanFor('frpa');

    expect(plan.signers.map((signer) => [signer.role, signer.signature, signer.date])).toEqual([
      ['merchant', '{{SIGNATURE, r1}}', '{{DATE, r1}}'],
      ['guarantor', '{{SIGNATURE, r2}}', '{{DATE, r2}}'],
      ['buyer', '{{SIGNATURE, r3}}', '{{DATE, r3}}'],
    ]);
  });

  /**
   * The two mechanisms must never name the same thing. A signature that became
   * a widget would be sender-writable and ship permanently blank — the failure
   * this vertical has a standing rule about.
   */
  it.each(PRODUCED_INSTRUMENTS)('%s marks no widget where a signer signs', (instrument) => {
    const plan = fieldPlanFor(instrument);
    const signerBindings = plan.signers.flatMap((signer) => [
      `${signer.signs}.signature`,
      `${signer.signs}.signedDate`,
    ]);

    expect(plan.marked.filter((field) => signerBindings.includes(field.binding))).toEqual([]);
  });
});
