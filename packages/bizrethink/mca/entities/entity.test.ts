import { describe, expect, it } from 'vitest';
import { ZMcaEntity, ZMcaEntityPolicy } from './entity';
import { entityFixture } from './entity.fixture';

/**
 * ADR 0026: an entity is **our side**, saved once and chosen when a template is
 * created.
 *
 * The tests worth having here are the ones about the boundary — what an entity
 * is allowed to be, and what it is not allowed to claim — rather than that Zod
 * validates strings.
 */

describe('an entity describes our side and nothing else', () => {
  it('accepts a complete entity', () => {
    expect(ZMcaEntity.safeParse(entityFixture()).success).toBe(true);
  });

  /**
   * A counterparty is never an entity. The merchant, the guarantor, the ISO
   * partner, the processor and the report subject all come from the caller at
   * send time — there will never be a template per broker for the same reason
   * there is not one per deal.
   *
   * `.strict()` is what enforces it, so this asserts the rule rather than
   * trusting the modifier stays there.
   */
  it.each([
    'merchantLegalName',
    'brokerLegalName',
    'processorLegalName',
    'guarantorName',
  ])('refuses a counterparty field: %s', (field) => {
    const withCounterparty = { ...entityFixture(), identity: { ...entityFixture().identity, [field]: 'Someone' } };

    expect(ZMcaEntity.safeParse(withCounterparty).success).toBe(false);
  });

  it('refuses an unknown policy key rather than ignoring it', () => {
    const policy = { ...entityFixture().policy, processorName: 'Payzli' };

    expect(ZMcaEntityPolicy.safeParse(policy).success).toBe(false);
  });
});

/**
 * A CONTRADICTION INSIDE THE GOODS IS PACTA'S BUSINESS; where a funder operates
 * is not. These two checks are the first kind: the entity would be internally
 * incoherent, not merely unwise.
 */
describe('an entity cannot claim two things at once', () => {
  it('refuses a funder-state forum on a programme serving Virginia', () => {
    const entity = entityFixture();

    entity.policy.venueRule = 'funder-state';
    entity.policy.recipientStates = ['US-VA'];
    entity.identity.venueState = 'Florida';

    const result = ZMcaEntity.safeParse(entity);

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toMatch(/6\.2-2234/);
  });

  it('refuses a funder-state forum with nowhere named', () => {
    const entity = entityFixture();

    entity.policy.venueRule = 'funder-state';
    entity.policy.recipientStates = ['US-NY'];
    entity.identity.venueState = '';

    const result = ZMcaEntity.safeParse(entity);

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toMatch(/venueState/);
  });

  it('allows a funder-state forum where one is named and no state fixes it', () => {
    const entity = entityFixture();

    entity.policy.venueRule = 'funder-state';
    entity.policy.recipientStates = ['US-NY', 'US-FL'];
    entity.identity.venueState = 'Florida';
    entity.identity.venueCounty = 'Miami-Dade';

    expect(ZMcaEntity.safeParse(entity).success).toBe(true);
  });

  /**
   * A merchant-state rule satisfies Virginia by construction, so it is not
   * refused — the point is the contradiction, not the state.
   */
  it('allows Virginia under a merchant-state rule', () => {
    const entity = entityFixture();

    entity.policy.venueRule = 'merchant-state';
    entity.policy.recipientStates = ['US-VA'];

    expect(ZMcaEntity.safeParse(entity).success).toBe(true);
  });
});

describe('what the entity carries for the documents it issues', () => {
  /**
   * These decide which clauses a document contains, which is why they belong to
   * the entity running the programme rather than to each document separately —
   * two documents from one programme must not disagree about the guaranty.
   */
  it('holds the programme facts a document is assembled from', () => {
    const { policy } = entityFixture();

    for (const key of ['venueRule', 'guarantyScope', 'renewalModel', 'equipment', 'disputeResolution']) {
      expect(policy).toHaveProperty(key);
    }
  });

  it('defaults an empty fee schedule rather than demanding one', () => {
    const { fees: _dropped, ...withoutFees } = entityFixture().policy;

    const parsed = ZMcaEntityPolicy.safeParse(withoutFees);

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.fees).toEqual([]);
  });
});
