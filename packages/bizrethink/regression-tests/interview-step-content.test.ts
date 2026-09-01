import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { FL_INTERVIEW } from '../lease/interview/steps';

/**
 * A step must show its own subject.
 *
 * Removing the two free-text utility boxes was right — they were a second,
 * editable copy of what the property already records, and they could be made
 * to disagree with it. But it left step 4, titled "Utilities and insurance",
 * showing only insurance. The landlord could no longer see what the lease was
 * going to say about utilities anywhere in the interview.
 *
 * Deriving an answer is not the same as hiding it. What the document will
 * print has to be visible at the moment it can still be changed — that is the
 * entire premise of this interview, and the reason every field carries its
 * consequence rather than just a box.
 *
 * Source-level: the summary is rendered by a component, and the failure mode
 * is a step going quiet rather than anything throwing.
 */

const ROUTE = 'apps/remix/app/routes/_authenticated+/t.$teamUrl+/leases.$id.tsx';

const route = readFileSync(new URL(`../../../${ROUTE}`, import.meta.url), 'utf8');

describe('steps whose fields are all derived', () => {
  it('step 4 still exists and is still about utilities', () => {
    const step = FL_INTERVIEW.find((entry) => entry.id === 'utilities');

    expect(step?.title.toLowerCase()).toContain('utilit');
  });

  it('shows what the lease will say about utilities, read-only, from the property', () => {
    expect(route).toMatch(/step\.id === 'utilities'/);
    expect(route).toMatch(/UtilitySummary/);
  });

  /*
    Read-only on purpose. An editable box here is the thing that was removed:
    two ways to state one fact, in a document whose reason for existing is that
    a lease must not contradict itself.
  */
  it('does not reintroduce utilities as answerable fields', () => {
    const step = FL_INTERVIEW.find((entry) => entry.id === 'utilities');

    expect(step?.fields.map((field) => field.name)).not.toContain('tenantUtilities');
    expect(step?.fields.map((field) => field.name)).not.toContain('landlordUtilities');
  });
});
