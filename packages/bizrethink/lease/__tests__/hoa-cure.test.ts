import { describe, expect, it } from 'vitest';
import type { ClauseFacts } from '../clauses/types';
import { FL_LIBRARY } from '../clauses/us-fl';
import { selectClauses } from '../engine/select-clauses';
import { allFields, FL_INTERVIEW } from '../interview/steps';
import { hydrateMatter } from '../server-only/matter-answers';

/**
 * Curing an association violation, and who actually has to do it.
 *
 * `hoa.compliance` made the tenant FORWARD a notice and REIMBURSE a fine. It
 * never said who performs the cure, or by when. So the real sequence at 29090
 * Picana Ln would have run: notice arrives 26 August naming dead palm fronds
 * with a 9 September cure date, tenant forwards it inside 48 hours as required,
 * nothing is trimmed, the fine lands. The lease worked exactly as written.
 *
 * TWO CHANNELS, NOT ONE. The association emails the owner directly AND mails
 * the property. That is why the cure deadline is keyed to the association's own
 * date rather than to the moment the tenant forwards: a tenant who bins the
 * letter would otherwise be moving the deadline. It is also why the landlord
 * owes a reciprocal duty to pass on what he receives — fining a tenant for
 * failing to cure something he was told about and never mentioned is not a
 * clause worth having.
 *
 * AND THE ASSOCIATION IS NOT A PARTY. Under Fla. Stat. §720.305(1) the remedy
 * runs against the parcel owner. Allocating palm trimming to the tenant is an
 * arrangement between landlord and tenant; it gives the tenant no standing with
 * the association and moves nothing off the owner. A landlord who reads "the
 * tenant handles the yard" will assume otherwise unless the clause says so.
 */

const facts = (overrides: Partial<ClauseFacts> = {}): ClauseFacts =>
  ({
    termMonths: 12,
    depositHeldUsd: 6900,
    advanceRentHeldUsd: 6900,
    depositCarriedInUsd: 0,
    advanceRentCarriedInUsd: 0,
    propertyYearBuilt: 2005,
    petsPermitted: false,
    hasNamedOccupants: false,
    hasHoa: true,
    prorationApplies: false,
    propertyType: 'single-family',
    hasPool: false,
    hasYardAllocation: true,
    hasTenantYardDuty: true,
    lateFeePolicy: 'flat',
    terminationOnSale: false,
    holdoverPenalty: false,
    earlyTerminationOffered: false,
    nonRenewalNoticeRequired: false,
    electronicNoticesElected: false,
    ...overrides,
  }) as ClauseFacts;

const slugs = (f: ClauseFacts) => {
  const { selected, addenda, standaloneDisclosures } = selectClauses({ facts: f, library: FL_LIBRARY });

  return [...selected, ...addenda, ...standaloneDisclosures].map((clause) => clause.slug);
};

const cure = FL_LIBRARY.find((clause) => clause.slug === 'hoa.cure');

describe('when the cure clause appears', () => {
  it('appears where there is an association and the tenant has yard duties', () => {
    expect(slugs(facts())).toContain('hoa.cure');
  });

  it('does not appear without an association', () => {
    expect(slugs(facts({ hasHoa: false }))).not.toContain('hoa.cure');
  });

  /*
    Nothing to cure. Where the landlord or the association does all of it, a
    clause obliging the tenant to cure is an obligation with no subject.
  */
  it('does not appear where the tenant has been given nothing outdoors', () => {
    expect(slugs(facts({ hasTenantYardDuty: false }))).not.toContain('hoa.cure');
  });
});

describe('what the cure clause says', () => {
  it('keys the deadline to the association, not to the tenant forwarding', () => {
    expect(cure?.body).toContain('{{hoaCureDays}}');
    expect(cure?.body).toMatch(/date stated in the notice/i);
  });

  it('obliges the landlord to pass on what the association sends him directly', () => {
    expect(cure?.body).toMatch(/Landlord shall.{0,120}notify Tenant/i);
  });

  /*
    The sentence a landlord most needs and would never write. Without it,
    "the tenant handles the yard" reads as though the association's claim went
    with it.
  */
  it('says the association can still pursue the owner', () => {
    expect(cure?.body).toMatch(/does not.{0,160}association/i);
    expect(cure?.requiredBy ?? '').toContain('720.305');
  });
});

describe('forwarding, in a house the tenant lives in', () => {
  const compliance = FL_LIBRARY.find((clause) => clause.slug === 'hoa.compliance');

  /*
    Association mail is addressed to the OWNER and delivered to the property.
    An obligation to forward "any notice received from the association" invites
    the tenant to open it; 18 U.S.C. §1702 is why the clause asks instead for
    what arrives at or is posted on the Premises.
  */
  it('asks for what arrives at the property, not for the owner’s post to be opened', () => {
    expect(compliance?.body).toMatch(/received at or posted on the Premises/i);
    expect(compliance?.body).not.toMatch(/any notice received from the association/i);
  });
});

describe('the cure window is asked for', () => {
  const field = allFields(FL_INTERVIEW).find((f) => f.name === 'hoaCureDays');

  it('is a question, not a constant', () => {
    expect(field).toBeDefined();
    expect(field?.showWhen).toBeDefined();
  });

  it('offers an attributed observation rather than a number out of the air', () => {
    expect(field?.suggestion?.note.toLowerCase()).toMatch(/\b(most|many|commonly|typically|usually|often|generally)\b/);
    expect(field?.statute).toBeUndefined();
  });
});

describe('hasTenantYardDuty', () => {
  const matter = {
    facts: {},
    money: {
      rent: { monthlyUsd: 6900, dueDayOfMonth: 1 },
      term: { startDate: '2026-09-01' },
      deposit: { securityUsd: 6900, alreadyHeldUsd: 0, advanceRentUsd: 0, advanceRentHeldUsd: 0, prepaidRentUsd: 0 },
      prorationMethod: 'actual-days-in-month',
    },
    values: { endDate: '2027-08-31' },
    customClauses: [],
    parties: [],
  };

  it('is true only where a row is actually the tenant’s', () => {
    expect(
      hydrateMatter({
        ...matter,
        yardTasks: [{ task: 'Palm and tree trimming', doneBy: 'tenant', frequency: '', notes: '' }],
      }).facts.hasTenantYardDuty,
    ).toBe(true);

    expect(
      hydrateMatter({
        ...matter,
        yardTasks: [{ task: 'Palm and tree trimming', doneBy: 'landlord', frequency: '', notes: '' }],
      }).facts.hasTenantYardDuty,
    ).toBe(false);
  });

  it('is false where the association does the outdoor work', () => {
    expect(
      hydrateMatter({
        ...matter,
        yardTasks: [{ task: 'Common-area mowing', doneBy: 'association', frequency: '', notes: '' }],
      }).facts.hasTenantYardDuty,
    ).toBe(false);
  });
});
