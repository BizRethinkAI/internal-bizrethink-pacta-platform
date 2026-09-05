import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

const clause = (slug: string) => FL_LIBRARY.find((c) => c.slug === slug);
const body = (slug: string) => clause(slug)?.body ?? '';

/*
  TERMS A RECORDED COVENANT REQUIRES THE LEASE TO CONTAIN.

  Ninth Amendment to the Amended and Restated Master Declaration for Estancia
  at Wiregrass, Instr# 2021271188, OR BK 10509 PG 675, recorded 16 Dec 2021.
  It rewrites Article XI, Section 36 (Leases).

  Three of its requirements are not "the landlord should consider" — they are
  things §36(b) says every lease SHALL contain:

    (b)(ii)  the lease shall be only for the entire Lot and associated garage
    (b)(iii) no tenant shall be permitted the use of more than two parking
             spaces (including the garage)
    (b)(iv)  every lease shall provide that the tenant shall be bound by and
             subject to all of the obligations of the Owner under this
             Declaration

  These sit in a different category from the drafting choices elsewhere in this
  library. A recorded covenant runs with the land; a lease that omits what it
  requires is non-compliant on its face.

  All four clauses are gated on hasHoa. A property with no association has no
  declaration to obey, and hard-coding these would make every non-HOA lease
  wrong in a way nobody would notice.
*/
describe("§36(b)(iv) — the tenant takes the owner's obligations", () => {
  it('says so, not merely that the tenant complies with the documents', () => {
    /*
      "Shall comply with them" is narrower than what the covenant demands. The
      Declaration asks for the tenant to stand in the owner's shoes as to every
      obligation it imposes.
    */
    expect(body('hoa.compliance')).toMatch(/bound by and subject to all of the obligations of the Owner/i);
  });

  it('still binds anyone the tenant permits at the premises', () => {
    expect(body('hoa.compliance')).toMatch(/anyone Tenant permits/i);
  });
});

describe('§36(b)(ii) and (iii) — the whole lot, and two parking spaces', () => {
  const scope = () => body('hoa.lease-scope');

  it('exists and is gated on there being an association', () => {
    expect(clause('hoa.lease-scope')).toBeDefined();
    expect(clause('hoa.lease-scope')?.includeWhen?.({ hasHoa: true } as never)).toBe(true);
    expect(clause('hoa.lease-scope')?.includeWhen?.({ hasHoa: false } as never)).toBe(false);
  });

  it('leases the entire lot and the garage, not a part of it', () => {
    expect(scope()).toMatch(/entire Lot and (the )?associated garage/i);
  });

  it('caps parking at two spaces, counting the garage', () => {
    // The garage counts. A two-car garage is the whole allowance.
    expect(scope()).toMatch(/two parking spaces/i);
    expect(scope()).toMatch(/including the garage/i);
  });

  it('cites the instrument, so a reader can check it', () => {
    expect(clause('hoa.lease-scope')?.requiredBy).toMatch(/2021271188|Ninth Amendment/i);
  });
});

/*
  AMENITY ACCESS IS NOT THE LANDLORD'S TO GRANT.

  Two gates, from two documents:

    Declaration §36(d)  no tenant may use the Common Areas or recreational
                        facilities until the Owner has complied with §36 —
                        i.e. filed the tenant's details and the signed lease
    Community Amenity Guidelines (Jan 2020)
                        the renter must be approved by the Board or Manager,
                        via a tenant profile form and an application fee

  The Guidelines name Evergreen Lifestyles Management and a $25 fee. The
  association is now managed by CMG. So the RULE survives the change of
  manager, and every operational detail around it — the form's name, the fee,
  the address — is unreliable in a six-year-old document.

  Which is why this clause names none of them. Hard-coding "$25" or a manager's
  name would be wrong on the day it was signed, and wrong again at the next
  change of agent.
*/
describe('amenity access depends on the association, not on us', () => {
  const amenity = () => body('hoa.amenity-access');

  it('exists, gated on there being an association', () => {
    expect(clause('hoa.amenity-access')).toBeDefined();
    expect(clause('hoa.amenity-access')?.includeWhen?.({ hasHoa: true } as never)).toBe(true);
  });

  it('does not promise access the Lease cannot give', () => {
    expect(amenity()).toMatch(/not guaranteed|does not guarantee|subject to/i);
  });

  it('puts the filing obligation on the landlord, where the Declaration puts it', () => {
    expect(amenity()).toMatch(/Landlord (shall|will)/);
  });

  it("says who pays the association's fees rather than leaving it silent", () => {
    expect(amenity()).toMatch(/\{\{amenityFeesPaidBy\}\}/);
  });

  it('names no management company, form or fee amount', () => {
    // Every one of these changes with the managing agent. The rule does not.
    for (const brittle of ['Evergreen', 'CMG', '$25', 'New Tenant Profile']) {
      expect(amenity()).not.toContain(brittle);
    }
  });
});
