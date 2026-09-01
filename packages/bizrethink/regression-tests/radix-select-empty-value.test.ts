import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * `<SelectItem value="">` throws, and the crash is invisible until a row exists.
 *
 * Radix reserves the empty string: setting a Select's VALUE to '' is how you
 * clear it and show the placeholder, so an ITEM may not claim it. The check is
 * a runtime throw inside the item, not a type error —
 *
 *   "A <Select.Item /> must have a value prop that is not an empty string."
 *
 * The yard editor shipped with exactly that, as a "Not decided" option. It
 * passed review, passed 666 unit tests, and rendered fine on every screen that
 * had no unassigned row — because the item is only constructed when a row is
 * drawn. The first person to press "Add a job" on a lease with no yard rows got
 * a full-page 500.
 *
 * '' remains the right value in the DATA: an unassigned job is a real state,
 * and `unassignedYardTasks` keys off it. It is only at the Radix boundary that
 * it needs a sentinel. This test is the boundary.
 */

const LEASE_UI = 'apps/remix/app/components/general/lease';

const sources = readdirSync(new URL(`../../../${LEASE_UI}`, import.meta.url))
  .filter((name) => name.endsWith('.tsx'))
  .map((name) => ({
    name,
    body: readFileSync(new URL(`../../../${LEASE_UI}/${name}`, import.meta.url), 'utf8'),
  }));

describe('Radix Select items', () => {
  it('finds the lease components, or this test is asserting nothing', () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it('never claims the empty string as an item value', () => {
    for (const source of sources) {
      // <SelectItem value=""> and <SelectItem value={''}> alike.
      expect(source.body, `${source.name} renders a SelectItem with an empty value`).not.toMatch(
        /<SelectItem[^>]*\svalue=(""|\{''\}|\{""\})/,
      );
    }
  });

  /*
    The subtler shape: an options array mapped into SelectItem, where the empty
    value is a data entry rather than a literal in the JSX. That is exactly how
    the yard editor did it, and a check that only looked at the JSX would have
    passed.
  */
  it('never maps an option list containing an empty value into items', () => {
    for (const source of sources) {
      if (!/<SelectItem[^>]*value=\{/.test(source.body)) {
        continue;
      }

      expect(source.body, `${source.name} has an option whose value is ''`).not.toMatch(/\bvalue:\s*(''|"")\s*,/);
    }
  });
});
