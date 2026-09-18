import { describe, expect, it } from 'vitest';

import { ALL_MCA_CONTENT, contentFor } from '../catalogue';
import { MCA_INSTRUMENTS, type McaInstrument } from '../clauses/instruments';
import { MCA_ENTITY_BINDINGS } from '../entities/entity';
import contract from './live-template-contract.json';
import { WIDGET_PARITY, type WidgetParity } from './template-parity';

/**
 * ADR 0023 §3 obliges the builder to reach parity with the templates in use
 * before it publishes anything. This is the measurement, and it is a test
 * rather than a document because "parity" written in prose is an opinion.
 *
 * WHAT THE CONTRACT ACTUALLY IS. The funder's platform prefills a published
 * template by **AcroForm widget name** — `formValues` keyed by the names in
 * `acroformFields` (`documenso-prefill-helper.mjs`, `buildFormValues`) — and
 * sends `prefillFields: []`. Field labels are not the interface; widget names
 * are. A name this repository renames breaks a caller it does not deploy.
 *
 * WHAT CATCHES A DRIFT TODAY, AND WHAT DOES NOT — corrected on 2026-09-17 after
 * the platform session checked rather than taking this file's word for it.
 *
 * Their CI does catch one: `pacta-v2-registry.test.ts` asserts every kind emits
 * exactly its template's widgets, and it is clean — 6,283 tests, not one
 * unknown-field warning. So nothing is being dropped silently today, and an
 * earlier draft of this comment overstated the exposure.
 *
 * What that spec cannot see is a template **republished from outside their
 * repository** — which is exactly what ADR 0023 introduces by making this
 * builder the producer. Their runtime backstop for it is lombard-platform #262
 * (it warns rather than throws, deliberately: a drifted name leaves the document
 * equally blank either way, and throwing at send time would turn a cosmetic
 * drift into an outage).
 *
 * So the risk this test answers is the one neither of those covers: a name
 * renamed HERE, in a template produced HERE. A diff is the right shape for it,
 * because it fails before anything is published rather than after.
 */

const bindingsFor = (instrument: McaInstrument): Set<string> => {
  const bindings = new Set<string>();

  for (const entry of contentFor(instrument)) {
    for (const field of entry.fields ?? []) {
      bindings.add(field.binding);
    }
  }

  return bindings;
};

const everyBinding = new Set(ALL_MCA_CONTENT.flatMap((entry) => (entry.fields ?? []).map((f) => f.binding)));

const instruments = Object.keys(contract.instruments) as McaInstrument[];

describe('the live templates are pinned, not remembered', () => {
  it('covers every instrument the library publishes', () => {
    expect([...instruments].sort()).toEqual([...MCA_INSTRUMENTS].sort());
  });

  it.each(instruments)('%s names exactly the widgets the live template has', (instrument) => {
    const live = contract.instruments[instrument].widgets;

    expect(Object.keys(WIDGET_PARITY[instrument]).sort()).toEqual([...live].sort());
  });

  /**
   * A widget name can carry several annotations — `merchant_legal_name` has
   * three on the FRPA — and one `formValues` entry fills all of them. A
   * renderer that emitted one field per occurrence would need three values for
   * one fact, so the count is recorded and the names stay unique.
   */
  it.each(instruments)('%s records more annotations than names, never fewer', (instrument) => {
    const record = contract.instruments[instrument];

    expect(new Set(record.widgets).size).toBe(record.widgets.length);
    expect(record.widgetAnnotations).toBeGreaterThanOrEqual(record.widgets.length);
  });
});

describe('every live widget is answered: by a binding, or by a stated gap', () => {
  const mapped = (instrument: McaInstrument): [string, WidgetParity][] => Object.entries(WIDGET_PARITY[instrument]);

  /**
   * The binding the builder would fill this widget from, or null.
   *
   * `absent-from-instrument` also names a binding — the one it would use if a
   * clause carried it — so presence of the key is not the question. Whether it
   * is a gap is.
   */
  const bound = (parity: WidgetParity): string | null => ('gap' in parity ? null : parity.binding);

  it.each(instruments)('%s binds only to fields a clause of that instrument carries', (instrument) => {
    const carried = bindingsFor(instrument);
    const missing = mapped(instrument)
      .map(([widget, parity]) => [widget, bound(parity)] as const)
      .filter(([, binding]) => binding !== null && !carried.has(binding))
      .map(([widget, binding]) => `${widget} → ${binding}`);

    expect(missing).toEqual([]);
  });

  /**
   * Each gap kind is a claim about the library, so each is checked against it.
   * A gap that stops being true fails here rather than sitting in a comment
   * that nobody re-reads.
   */
  it.each(instruments)('%s states gaps that are still true', (instrument) => {
    const carried = bindingsFor(instrument);
    const wrong: string[] = [];

    for (const [widget, parity] of mapped(instrument)) {
      if (!('gap' in parity)) {
        continue;
      }

      if (parity.gap === 'unmodelled' && parity.candidate && everyBinding.has(parity.candidate)) {
        wrong.push(`${widget}: ${parity.candidate} now exists — the gap is no longer "unmodelled"`);
      }

      if (parity.gap === 'absent-from-instrument') {
        if (!everyBinding.has(parity.binding)) {
          wrong.push(`${widget}: ${parity.binding} is in no clause at all — that is "unmodelled", not "absent"`);
        }

        if (carried.has(parity.binding)) {
          wrong.push(`${widget}: ${parity.binding} is now carried by ${instrument} — bind it`);
        }
      }
    }

    expect(wrong).toEqual([]);
  });

  /**
   * A WIDGET THE BUILDER WOULD NOT EMIT AT ALL, and the sharpest parity break
   * found here.
   *
   * These names are filled per deal today, by the platform. In the builder the
   * same facts come from the provider profile (`MCA_ENTITY_BINDINGS`) and are
   * resolved when the template is published — so they would be printed text,
   * not a widget. The platform would keep sending values for names that no
   * longer exist, and `buildFormValues` would not complain.
   *
   * Pinned so the list cannot grow unnoticed. Closing it is a decision about
   * each name — keep the widget, or tell the platform to stop sending it — and
   * that decision belongs to the first publication, not to this measurement.
   */
  it('names every widget the builder would resolve at publication instead', () => {
    const fixed = instruments.flatMap((instrument) =>
      mapped(instrument)
        .filter(([, parity]) => {
          const binding = bound(parity);
          return binding !== null && MCA_ENTITY_BINDINGS.has(binding);
        })
        .map(([widget]) => `${instrument}.${widget}`),
    );

    expect(fixed.sort()).toEqual([
      'equipment-lease.provider_address',
      'equipment-lease.provider_legal_name',
      'frpa.provider_address',
      'iso-pra.provider_legal_name',
      'subscription.provider_address',
      'subscription.provider_legal_name',
    ]);
  });

  /**
   * ADR 0019: a split funding letter belongs to the processor and is used
   * exactly as supplied. The builder does not produce one, and `compile.ts`
   * already excludes it from the assembled documents — so every widget on that
   * template is the processor's, and none of them is ours to emit.
   */
  it('claims none of the split funding letter', () => {
    const parity = Object.values(WIDGET_PARITY['split-funding']);

    expect(parity.every((entry) => 'gap' in entry && entry.gap === 'processor-controlled')).toBe(true);
    expect(bindingsFor('split-funding').size).toBe(0);
  });

  /**
   * The source documents carry a full SSN slot for the guarantor. The library
   * retired it (`retiredGuarantorSsn`), which means builder output is not a
   * drop-in replacement for the live template — a difference worth failing on
   * if it is ever quietly reversed.
   */
  it('still refuses the guarantor SSN widget on both templates that have one', () => {
    for (const instrument of ['frpa', 'equipment-lease'] as const) {
      expect(WIDGET_PARITY[instrument].guarantor_ssn).toEqual({
        gap: 'retired',
        why: expect.stringContaining('secure channel'),
      });
    }

    expect([...everyBinding].filter((binding) => binding.toLowerCase().includes('ssn'))).toEqual([]);
  });
});

describe('the recipients a template expects', () => {
  it.each(instruments)('%s signs with as many parties as the live template', (instrument) => {
    const record = contract.instruments[instrument];

    expect(record.signerFields.SIGNATURE).toBe(record.recipients.length);
    expect(record.signerFields.DATE).toBe(record.recipients.length);
  });

  /**
   * The twin `instruments.ts` describes is one template in the send path: the
   * platform has no `equipment-lease` kind and resolves `subscription` to the
   * equipment lease record. Pinning it makes the divergence visible instead of
   * letting the builder publish two templates into a path expecting one.
   */
  it('records that the lease and the subscription share one live template', () => {
    expect(contract.instruments.subscription.templateId).toBe(contract.instruments['equipment-lease'].templateId);
    expect(contract.instruments.subscription.platformKind).toBe('subscription');
    expect(contract.instruments['equipment-lease'].platformKind).toBe('subscription');
  });
});
