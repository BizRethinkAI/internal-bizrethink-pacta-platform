import { describe, expect, it } from 'vitest';

import { entityFixture } from './entity.fixture';
import { entitySummaryLine } from './summary';

/**
 * The line under an entity's name in the list.
 *
 * Modelled on the lease builder's property card, which reads
 * "single family · Wesley Chapel, FL · Pasco County · pool · HOA" — the facts
 * that decide what a document against it will say, so a person can tell two
 * records apart without opening either.
 *
 * For an entity those are what it IS and what its programme DOES: two entities
 * can share a legal name, which is why `label` exists at all, and they can
 * share a label while running different programmes.
 */
describe('entitySummaryLine', () => {
  const entity = entityFixture();

  it('leads with what the entity is and where it is organised', () => {
    const line = entitySummaryLine(entity);

    expect(line.startsWith(`${entity.identity.entityType} · ${entity.identity.organizationState}`)).toBe(true);
  });

  it('says how the programme collects, because that is what a merchant signs up to', () => {
    expect(entitySummaryLine(entity)).toContain(entity.policy.collectionMethod.replace(/-/g, ' '));
  });

  /*
    The recipient states decide which disclosures a document carries, so two
    entities alike in every other way still produce different paper. A count
    rather than a list: eleven state codes would be the whole line.
  */
  it('counts the states the programme serves', () => {
    const line = entitySummaryLine({
      ...entity,
      policy: { ...entity.policy, recipientStates: ['US-CA', 'US-NY', 'US-TX'] },
    });

    expect(line).toContain('3 states');
  });

  it('says one state in the singular', () => {
    const line = entitySummaryLine({ ...entity, policy: { ...entity.policy, recipientStates: ['US-CA'] } });

    expect(line).toContain('1 state');
    expect(line).not.toContain('1 states');
  });

  /*
    An entity serving nowhere yet is a real state — it is what a half-finished
    one looks like — and "0 states" reads like a defect rather than a fact.
  */
  it('says so plainly when no state has been chosen', () => {
    const line = entitySummaryLine({ ...entity, policy: { ...entity.policy, recipientStates: [] } });

    expect(line).toMatch(/no states yet/i);
    expect(line).not.toContain('0 states');
  });

  it('separates the facts the way the property card does', () => {
    // Same separator, so the two lists read as one product rather than two.
    expect(entitySummaryLine(entity).split(' · ').length).toBeGreaterThanOrEqual(4);
  });

  it('never runs a field together with the one after it', () => {
    const line = entitySummaryLine(entity);

    expect(line).not.toMatch(/ {2,}/);
    expect(line.trim()).toBe(line);
  });
});
