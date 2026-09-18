import { describe, expect, it } from 'vitest';

import { contentFor } from '../catalogue';
import { MCA_ENTITY_BINDINGS } from '../entities/entity';
import { fieldPlanFor } from './field-plan';
import { FIELD_TRIAGE, newWidgetNames, unreachableDealFields } from './field-triage';
import { PRODUCED_INSTRUMENTS } from './recipient-contract';
import { WIDGET_PARITY } from './template-parity';

/**
 * THE GAP THE OTHER WAY ROUND, and the larger one.
 *
 * `field-plan.ts` partitions the names the LIVE templates carry and asks what
 * the builder can produce for each. This asks the reverse: the builder's
 * documents contain deal fields the live templates have no widget for at all,
 * so a template published today would put blanks in front of a merchant where
 * those fields sit — and no amount of care on the sending side would fill them,
 * because there is nothing to send them to.
 *
 * Each one is triaged into what it actually is:
 *
 *   programme   a term of the funder's programme, the same on every deal. It
 *               belongs in the provider profile and is set in type when the
 *               template is published, so it needs no widget and no caller
 *               change.
 *   per-deal    genuinely different per merchant. It needs a NEW widget name,
 *               which is a change in a repository this session does not own,
 *               so the list is kept short and explicit.
 *   control     drives selection or validation and is never printed.
 *   duplicate   a second binding for a fact another binding already carries.
 *
 * The classification is a judgement and is meant to be argued with; the test
 * checks that it is complete and consistent, not that it is right.
 */

const bindingsOf = (instrument: (typeof PRODUCED_INSTRUMENTS)[number]): Set<string> => {
  const bindings = new Set<string>();

  for (const entry of contentFor(instrument)) {
    for (const field of entry.fields ?? []) {
      bindings.add(field.binding);
    }
  }

  return bindings;
};

/** Every widget name any live template uses, and the binding it stands for. */
const liveNames = new Map<string, string>();

for (const instrument of PRODUCED_INSTRUMENTS) {
  for (const [widget, parity] of Object.entries(WIDGET_PARITY[instrument])) {
    if (!('gap' in parity)) {
      liveNames.set(widget, parity.binding);
    }
  }
}

describe('a signer’s email is not a document field', () => {
  /**
   * It is how the envelope reaches the person — supplied per send in the
   * recipients payload — and no live template has a widget for one. Printing it
   * into the page would duplicate a fact the envelope owns, in a document the
   * merchant signs.
   */
  it.each(PRODUCED_INSTRUMENTS)('%s carries no signer email among its fields', (instrument) => {
    expect([...bindingsOf(instrument)].filter((binding) => /^signers\..+\.email$/.test(binding))).toEqual([]);
  });

  it('still keeps the parties it must reach', () => {
    // The signature block, and therefore the recipient list, is unaffected:
    // name, capacity, signature and date all remain.
    const frpa = bindingsOf('frpa');

    for (const suffix of ['name', 'capacity', 'signature', 'signedDate']) {
      expect(frpa.has(`signers.merchant.${suffix}`)).toBe(true);
    }
  });
});

describe('every unreachable field is accounted for', () => {
  it.each(PRODUCED_INSTRUMENTS)('%s leaves no deal field untriaged', (instrument) => {
    expect(unreachableDealFields(instrument).filter((binding) => !FIELD_TRIAGE[binding])).toEqual([]);
  });

  /**
   * REACHABILITY IS PER INSTRUMENT, which is easy to forget and was got wrong
   * here first. `guarantor.email` has a widget on the FRPA and none on the
   * lease, so it is both reachable and unreachable depending on the document.
   * What must not happen is an entry for a binding that is reachable
   * everywhere it appears — that would be triaging a solved problem.
   */
  it('triages nothing that every instrument carrying it can already fill', () => {
    const solved = Object.keys(FIELD_TRIAGE).filter((binding) =>
      PRODUCED_INSTRUMENTS.every((instrument) => {
        const plan = fieldPlanFor(instrument);
        const carried = bindingsOf(instrument).has(binding);

        return !carried || plan.marked.some((field) => field.binding === binding);
      }),
    );

    expect(solved).toEqual([]);
  });

  it('triages nothing the provider profile already resolves', () => {
    expect(Object.keys(FIELD_TRIAGE).filter((binding) => MCA_ENTITY_BINDINGS.has(binding))).toEqual([]);
  });

  it('carries no entry for a binding no instrument actually has', () => {
    const everywhere = new Set(PRODUCED_INSTRUMENTS.flatMap((instrument) => [...unreachableDealFields(instrument)]));

    expect(
      Object.keys(FIELD_TRIAGE)
        .filter((binding) => !everywhere.has(binding))
        .sort(),
    ).toEqual([]);
  });
});

describe('the names proposed for the per-deal ones', () => {
  const perDeal = Object.entries(FIELD_TRIAGE).flatMap(([binding, triage]) =>
    triage.kind === 'per-deal' ? [[binding, triage.widget] as const] : [],
  );

  it('are widget names, in the shape the live templates use', () => {
    expect(perDeal.filter(([, widget]) => !/^[a-z][a-z0-9_]*$/.test(widget))).toEqual([]);
  });

  it('never propose one name for two different facts', () => {
    const names = perDeal.map(([, widget]) => widget);

    expect(names.length).toBe(new Set(names).size);
  });

  /**
   * A name already in use somewhere must keep meaning what it means there.
   * `guarantor_email` is a live FRPA widget and the lease has none; reusing the
   * name for the same fact is how the templates stay legible to one caller,
   * and reusing it for a DIFFERENT fact is how that caller gets it wrong.
   */
  it('reuse an existing name only for the fact it already names', () => {
    const wrong = perDeal.filter(([binding, widget]) => liveNames.has(widget) && liveNames.get(widget) !== binding);

    expect(wrong).toEqual([]);
  });
});

/**
 * THE SIZE OF THE ASK, pinned. `per-deal` is the only column that costs anybody
 * else anything: it is the number of new widget names `lombard-platform` would
 * have to learn to send. Everything else is work inside this repository.
 */
describe('how much of this lands on the caller', () => {
  it('counts the triage by kind', () => {
    const counts = Object.values(FIELD_TRIAGE).reduce<Record<string, number>>((tally, triage) => {
      tally[triage.kind] = (tally[triage.kind] ?? 0) + 1;
      return tally;
    }, {});

    expect(counts).toEqual({ programme: 12, 'per-deal': 27, control: 1, duplicate: 1 });

    // 27 new widget names is the whole ask on the caller. Everything else —
    // twelve provider-profile fields, one control, one duplicate to retire —
    // is work inside this repository.
    expect(newWidgetNames()).toHaveLength(27);
  });
});
