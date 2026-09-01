import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import type { YardTask } from '../yard/derive-yard';
import {
  DEFAULT_YARD_TASKS,
  renderYardDuties,
  renderYardList,
  seedYardTasks,
  splitByDoer,
  unassignedYardTasks,
} from '../yard/derive-yard';

/**
 * Who does what in the yard.
 *
 * This was a single boolean, `landlordProvidesLawnService`, with the whole
 * allocation hard-coded into the clause body: landlord mows, tenant waters and
 * trims. A landlord whose split runs the other way — fertiliser his, mowing and
 * shrubs the tenant's — could not express it. Turning the boolean off did not
 * help: no clause rendered at all and the yard went out UNALLOCATED.
 *
 * So: rows, one `doneBy` each, all three lists derived from the one array. A
 * task cannot land on two sides or on none.
 *
 * Per LEASE, not per property, unlike utilities. The electric co-op does not
 * change between tenancies; who cuts the grass is negotiated with the person
 * signing.
 */

const rows: YardTask[] = [
  { task: 'Mowing and edging', doneBy: 'tenant', frequency: 'Weekly', notes: '' },
  { task: 'Irrigation and watering', doneBy: 'tenant', frequency: '', notes: '' },
  {
    task: 'Palm and tree trimming',
    doneBy: 'tenant',
    frequency: 'Twice yearly',
    notes: 'dead fronds and seed heads',
  },
  { task: 'Fertilisation and pest treatment', doneBy: 'landlord', frequency: '', notes: '' },
  { task: 'Common-area mowing', doneBy: 'association', frequency: '', notes: '' },
];

describe('renderYardList', () => {
  it('names the task alone when there is nothing to qualify it', () => {
    expect(renderYardList([rows[1]])).toBe('irrigation and watering');
  });

  it('appends the frequency', () => {
    expect(renderYardList([rows[0]])).toBe('mowing and edging, weekly');
  });

  it('carries the note in brackets before the frequency', () => {
    expect(renderYardList([rows[2]])).toBe('palm and tree trimming (dead fronds and seed heads), twice yearly');
  });

  it('joins two with "and"', () => {
    expect(renderYardList([rows[1], rows[3]])).toBe('irrigation and watering and fertilisation and pest treatment');
  });

  it('serial-commas three or more', () => {
    expect(renderYardList([rows[0], rows[1], rows[3]])).toBe(
      'mowing and edging, weekly, irrigation and watering, and fertilisation and pest treatment',
    );
  });

  it('drops rows with no task rather than printing a stray comma', () => {
    expect(renderYardList([rows[1], { task: '   ', doneBy: 'tenant', frequency: '', notes: '' }])).toBe(
      'irrigation and watering',
    );
  });

  /*
    The point of departure from renderUtilityList, which returns 'none'.
    Utilities interpolate mid-sentence, so 'none' completes it. Here an empty
    side must delete its whole sentence — see renderYardDuties.
  */
  it('returns empty for no rows, NOT the word "none"', () => {
    expect(renderYardList([])).toBe('');
  });
});

describe('splitByDoer', () => {
  it('routes each task to exactly one side', () => {
    const split = splitByDoer(rows);

    expect(split.tenant).toContain('mowing and edging');
    expect(split.landlord).toContain('fertilisation');
    expect(split.association).toContain('common-area mowing');
  });

  it('never lets a task appear on two sides', () => {
    const split = splitByDoer(rows);

    for (const row of rows) {
      const word = row.task.toLowerCase();
      const sides = [split.tenant, split.landlord, split.association].filter((side) => side.includes(word));

      expect(sides).toHaveLength(1);
    }
  });

  it('leaves an unassigned task off every side rather than guessing', () => {
    const split = splitByDoer([{ task: 'Hedge cutting', doneBy: '', frequency: '', notes: '' }]);

    expect(split.tenant).toBe('');
    expect(split.landlord).toBe('');
    expect(split.association).toBe('');
  });
});

describe('renderYardDuties', () => {
  it('states each side that has tasks', () => {
    const prose = renderYardDuties(rows);

    expect(prose).toContain("Tenant shall, at Tenant's cost");
    expect(prose).toContain("Landlord shall, at Landlord's cost");
    expect(prose).toContain('provided by the association');
  });

  /*
    The empty-sentence bug this exists to prevent:
    "Landlord shall, at Landlord's cost, attend to the following: none."
  */
  it('omits a side entirely when nothing is assigned to it', () => {
    const prose = renderYardDuties([rows[0]]);

    expect(prose).toContain('Tenant shall');
    expect(prose).not.toContain('Landlord shall');
    expect(prose).not.toContain('association');
    expect(prose).not.toContain('none');
  });

  it('is empty when there is nothing allocated at all', () => {
    expect(renderYardDuties([])).toBe('');
  });

  it('does not leave a double space where a side was dropped', () => {
    expect(renderYardDuties(rows)).not.toMatch(/ {2}/);
  });
});

describe('unassignedYardTasks', () => {
  /*
    The defect that made the old boolean unusable: switching it off produced a
    lease with no yard clause and no allocation. An unassigned row must block
    the send, not render as silence.
  */
  it('names the rows nobody has been given', () => {
    expect(unassignedYardTasks([rows[0], { task: 'Hedge cutting', doneBy: '', frequency: '', notes: '' }])).toEqual([
      'Hedge cutting',
    ]);
  });

  it('ignores blank rows, which are an empty form and not an unallocated duty', () => {
    expect(unassignedYardTasks([{ task: '  ', doneBy: '', frequency: '', notes: '' }])).toEqual([]);
  });

  it('is empty when everything is allocated', () => {
    expect(unassignedYardTasks(rows)).toEqual([]);
  });
});

describe('seedYardTasks', () => {
  it('seeds the standard Florida list with nobody assigned', () => {
    const seeded = seedYardTasks();

    expect(seeded).toHaveLength(DEFAULT_YARD_TASKS.length);
    expect(seeded.every((row) => row.doneBy === '')).toBe(true);
  });

  it('includes palm trimming, which is what the association actually cites', () => {
    expect(DEFAULT_YARD_TASKS.some((task) => /palm/i.test(task))).toBe(true);
  });

  /*
    Pool is deliberately absent. maintenance.pool-split already allocates it,
    and a pool row here would assign it twice, in two clauses, with nothing
    keeping the two answers the same.
  */
  it('leaves the pool to the pool clause', () => {
    expect(DEFAULT_YARD_TASKS.some((task) => /pool|spa|hot tub/i.test(task))).toBe(false);
  });

  /*
    numericLeafPaths() in the engine walks values with Object.entries and
    recurses into arrays, so a numeric row field would surface as
    "values.yardTasks.0.frequency" in the coherence checker.
  */
  it('holds every field as a string, so the coherence walker stays blind to it', () => {
    for (const row of seedYardTasks()) {
      for (const value of Object.values(row)) {
        expect(typeof value).toBe('string');
      }
    }
  });
});

/**
 * An unallocated job must block the send, not merely be mentioned.
 *
 * This is the defect the whole change exists to remove: the old boolean, when
 * off, produced a lease with no yard clause and a yard nobody was responsible
 * for, and nothing anywhere said so. Reintroducing it as "a warning in a panel
 * the landlord can scroll past" would be the same failure with better
 * manners.
 *
 * Source-level because the router needs a database to run, and this needs to
 * fail on the commit that drops the check rather than in production.
 */
describe('the send gate', () => {
  const router = readFileSync(new URL('../../server-only/trpc/lease-builder-router.ts', import.meta.url), 'utf8');

  it('reports unallocated jobs from validate', () => {
    expect(router).toMatch(/yardFindings\s*=\s*unassignedYardTasks/);
  });

  it('counts them as blocking and withholds readyToSend', () => {
    const blocking = router.slice(router.indexOf('blocking:'), router.indexOf('rulePackVersion: US_FL.version'));

    expect(blocking).toContain('yardFindings.length +');
    expect(blocking).toContain('yardFindings.length === 0');
  });

  /*
    `validate` is a query. Nothing forces a client to call it, so the mutation
    that creates real signers re-checks — the same rule the custom-clause scan
    and the party list already follow.
  */
  it('re-checks in the mutation, not only in the query', () => {
    const send = router.slice(router.indexOf('const envelope = await createEnvelopeFromMatter') - 4000);

    expect(send.slice(0, 4000)).toMatch(/unassignedYardTasks\(/);
  });
});

/**
 * A lease that predates the yard rows starts with nothing.
 *
 * `seedYardTasks` runs at matter CREATION, so every draft opened before this
 * feature existed has an empty list — and the only thing offered was "Add a
 * job", one blank row at a time, six times, retyping a list the code already
 * knows. That is the moment somebody reasonably asks whether AI could fill it
 * in, and the honest answer is that nothing needs to be predicted: the job
 * names are a constant, and only the allocation is a decision.
 */
describe('the standard list is offered, not only seeded', () => {
  const editor = readFileSync(
    new URL('../../../../apps/remix/app/components/general/lease/yard-task-editor.tsx', import.meta.url),
    'utf8',
  );

  it('is reachable from the editor for a lease that has none', () => {
    expect(editor).toMatch(/seedYardTasks/);
  });

  /*
    The allocation is never filled in for them. Choosing who mows is the one
    part of this that is a decision rather than a list, and a pre-filled answer
    to it reads as agreed.
  */
  it('still leaves every job unassigned', () => {
    expect(seedYardTasks().every((row) => row.doneBy === '')).toBe(true);
  });
});
