import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * EVERY QUESTION THE RAIL COUNTS MUST BE ON THE STEP IT COUNTS IT FOR.
 *
 * The rail shows how many answers a step still wants. That number is read from
 * each step's `fields`, and the questions themselves are hand-written JSX under
 * a `step === STEP_INDEX.<id>` guard — two lists that have to agree and nothing
 * making them.
 *
 * They did not agree. Splitting the old two-tab form into eleven steps put
 * three boundaries one element early, so:
 *
 *   - "What this release supports" stated the constraint and offered nothing to
 *     agree to, while its checkbox opened the venue step;
 *   - `disputeResolution` was counted on "Venue and disputes" and rendered on
 *     "Guaranty and renewal";
 *   - `renewalModel` was counted on "Guaranty and renewal" and rendered on
 *     "Equipment and positions".
 *
 * The first was loud — the E2E timed out waiting for a checkbox that existed on
 * the wrong step. The other two were silent, and silent is worse: a step says
 * one answer is outstanding and shows you nothing to answer, so the only way
 * to clear it is to find the question somewhere you were not sent.
 *
 * Asserted on the source, because the failure is in which guard a block sits
 * under and this repo has no React rendering harness.
 */
const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../components/entity-editor.tsx'), 'utf8');

/**
 * `fields: […]` from the STEPS table, by step id.
 *
 * Read entry by entry rather than with one pattern over the whole table: the
 * formatter wraps a long `fields` list across lines and keeps a short one on
 * one, so a pattern that assumed either shape silently matched nine of eleven
 * entries — which is how a source-reading test goes quietly vacuous. The count
 * assertion below exists because of exactly that.
 */
const declared = (): Record<string, string[]> => {
  const table = source.slice(source.indexOf('const STEPS = ['), source.indexOf('] as const;'));

  return Object.fromEntries(
    [...table.matchAll(/id: '([\w-]+)'/g)].map((match) => {
      const from = table.indexOf('fields: [', match.index ?? 0);
      const list = table.slice(from, table.indexOf(']', from));

      return [match[1], [...list.matchAll(/'([^']+)'/g)].map(([, name]) => name)];
    }),
  );
};

/**
 * Questions a step renders through a component rather than a `name=` literal.
 *
 * `<RecipientStates />` and `<FeeSchedule />` are whole answers with their own
 * internal layout — a state picker and a repeater — so the field name lives
 * inside them. Named here rather than inferred, so adding a third such
 * component fails this test rather than quietly widening what counts as
 * rendered.
 */
const THROUGH_A_COMPONENT: Record<string, string> = {
  RecipientStates: 'policy.recipientStates',
  FeeSchedule: 'policy.fees',
};

/** Which fields appear under each `step === STEP_INDEX.<id>` guard. */
const rendered = (): Record<string, string[]> => {
  const guards = [...source.matchAll(/step === STEP_INDEX\.(\w+)/g)];

  return Object.fromEntries(
    guards.map((guard, index) => {
      const from = guard.index ?? 0;
      const to = guards[index + 1]?.index ?? source.length;

      const body = source.slice(from, to);
      const literal = [...body.matchAll(/name="((?:policy|identity)\.[\w.]+|label)"/g)].map(([, name]) => name);
      const viaComponent = Object.entries(THROUGH_A_COMPONENT)
        .filter(([component]) => body.includes(`<${component}`))
        .map(([, name]) => name);

      return [guard[1], [...literal, ...viaComponent]];
    }),
  );
};

describe('the interview rail counts only what its step renders', () => {
  it('finds both lists, so a rename cannot make this vacuous', () => {
    expect(Object.keys(declared()).length).toBeGreaterThanOrEqual(11);
    expect(Object.keys(rendered()).length).toBeGreaterThanOrEqual(11);
  });

  it('renders every field it counts, on the step that counts it', () => {
    const shown = rendered();
    const misplaced = Object.entries(declared()).flatMap(([id, fields]) =>
      fields
        .filter((name) => !(shown[id] ?? []).includes(name))
        .map((name) => `${id} counts ${name} but does not render it`),
    );

    expect(misplaced).toEqual([]);
  });

  /*
    The reverse is allowed and deliberate: `identity.venueState` renders on the
    venue step and is not counted, because it is optional — an entity naming
    only a state gets a state-wide forum. Counting an optional answer would
    leave a finished step looking unfinished forever. What is NOT allowed is a
    required field rendering nowhere at all.
  */
  it('renders every question somewhere', () => {
    const everywhere = Object.values(rendered()).flat();
    const orphaned = Object.values(declared())
      .flat()
      .filter((name) => !everywhere.includes(name));

    expect(orphaned).toEqual([]);
  });
});
