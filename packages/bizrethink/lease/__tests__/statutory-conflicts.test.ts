import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

/**
 * Clauses that said something Florida does not permit, or asserted something
 * the library cannot know.
 *
 * All four came out of two independent adversarial reviews of a real lease, and
 * each was checked against the statute text before being accepted — one review
 * finding was rejected on that check, which is why these are pinned by what the
 * statute actually says rather than by what a reviewer said about it.
 */

const clause = (slug: string) => {
  const found = FL_LIBRARY.find((c) => c.slug === slug);
  if (!found) {
    throw new Error(`${slug} is missing`);
  }
  return found;
};

describe('general.waiver and Fla. Stat. §83.56(5)', () => {
  /*
    §83.56(5): a landlord who accepts rent with actual knowledge of a
    noncompliance WAIVES the right to terminate or sue for that noncompliance.
    The clause said the opposite in terms — "acceptance of a payment with
    knowledge of a breach is not a waiver of that breach" — and §83.47(1)(a)
    voids a provision purporting to waive a right conferred by the part.

    A clause that is void is worse than no clause: it is the one a tenant's
    lawyer reads aloud to show the lease overreaches.
  */
  it('does not claim that accepting rent preserves a known breach', () => {
    const { body } = clause('general.waiver');

    expect(body).not.toMatch(/acceptance of a payment with knowledge of a breach is not a waiver/i);
  });

  it('defers to the statute, and says which one', () => {
    const { body } = clause('general.waiver');

    expect(body).toMatch(/83\.56\(5\)/);
    // The right that survives is for SUBSEQUENT or CONTINUING noncompliance,
    // which is the carve-out the statute itself makes.
    expect(body).toMatch(/subsequent or continuing/i);
  });
});

describe('access.entry and Fla. Stat. §83.53(1)', () => {
  /*
    §83.53(1)'s exhibition list is closed: "prospective or actual purchasers,
    mortgagees, tenants, workers, or contractors". An insurer is not on it, and
    a lease cannot add to a statutory list of people a tenant must admit.
  */
  it('shows the premises only to those §83.53(1) names', () => {
    const { body } = clause('access.entry');

    expect(body).not.toMatch(/insurer/i);
  });
});

describe('the §83.49 holding requirements', () => {
  /*
    §83.49(1)(a) requires a SEPARATE non-interest-bearing account and says the
    landlord "shall not commingle such moneys with any other funds". The clause
    named the bank and said the account bears no interest — two of the three.
  */
  it('states the deposit account is separate and not commingled', () => {
    const { body } = clause('deposit.held');

    expect(body).toMatch(/separate/i);
    expect(body).toMatch(/commingle/i);
  });

  /*
    §83.49(1) opens "as security for performance of the rental agreement OR AS
    ADVANCE RENT". Advance rent for other than the next immediate rental period
    is held the same way a deposit is. The clause described what the advance
    rent is for and never said where it sits.
  */
  it('says where the advance rent is held, because the statute covers it too', () => {
    const { body } = clause('deposit.advance-rent');

    expect(body).toMatch(/83\.49/);
    expect(body).toMatch(/held/i);
  });
});

describe('hoa.lease-requirements does not certify itself', () => {
  /*
    THE WORST OF THE FOUR, and self-inflicted. The clause read "require this
    Lease to include the following, and it does:" followed by whatever the
    landlord typed. On the real lease that list included "the entire Lot and the
    associated garage" and "no more than two parking spaces" — neither of which
    appeared anywhere else in the document. The lease certified compliance it
    did not deliver, on the one document an association manager checks.

    "and it does" is an assertion about the whole document that a single clause
    cannot possibly verify. The fix is to stop asserting and start binding: the
    requirements are agreed AS TERMS, so the lease contains them by
    construction rather than by claim.
  */
  it('makes the requirements terms rather than a claim about the document', () => {
    const { body } = clause('hoa.lease-requirements');

    expect(body).not.toMatch(/and it does/i);
    expect(body).toMatch(/agree/i);
  });
});

describe('hoa.lease-requirements does not undo the rest of the lease', () => {
  /*
    THE CONTRADICTION ONLY THE RENDERED LEASE SHOWED, and the reason reading
    clause source is not enough on its own.

    `hoa.compliance` was narrowed so an owner's duty to pay assessments could
    not land on a tenant: bound only to the obligations "that govern the use,
    occupancy and conduct of the Premises". But THIS clause prints whatever the
    declaration demands, and Estancia's Ninth Amendment (Instr# 2021271188,
    Art. XI §36(b)(iv)) demands the words "bound by and subject to ALL of the
    obligations of the Owner".

    So on the page the narrowed clause and the verbatim requirement sat two
    paragraphs apart saying opposite things — 11.1 against 11.3 — and the
    narrowing that fixed one was silently undone by the other. The requirement
    cannot simply be dropped: §36(b) says each lease "shall have, at a minimum,
    the following terms and conditions", so omitting it fails the declaration's
    own test on the document an association manager reads.

    Keep the words, bound their effect. Ambiguity is construed against the
    drafter, and the drafter is the landlord.
  */
  it('carves the money of ownership back out', () => {
    const { body } = clause('hoa.lease-requirements');

    expect(body).toMatch(/do not make Tenant liable for assessments/i);
    expect(body).toMatch(/capital contributions|monetary obligations of ownership/i);
  });

  /*
    8.1 goes to the trouble of naming the §83.51(1) modification right a
    single-family lease has, and expressly declining to use it. Without this
    limb, a requirement to assume "all of the obligations of the Owner" reaches
    the Lot-maintenance duties that overlap §83.51(1) and quietly reverses that
    choice. §83.47(1)(a) voids the overlap anyway — but a void term still sits
    in the document being read aloud.
  */
  it("leaves the landlord's non-delegable duties where the law puts them", () => {
    const { body, jurisdiction } = clause('hoa.lease-requirements');

    expect(body).toMatch(/does not permit to be transferred/i);

    /*
      And says so WITHOUT naming one state's statute. The clause is generic:
      North Carolina selects it too, and a Florida citation here would make it
      Florida's, which `clause-jurisdictions` fails on. Stated by effect it
      reaches §83.51(1) in Florida and §42-42 in North Carolina alike.
    */
    expect(jurisdiction).toBe('generic');
    expect(body).not.toMatch(/Fla\. Stat\.|N\.C\. Gen\. Stat\./);
  });

  /*
    The carve-out must not swallow the clause. What the declaration compels is
    still printed, still from the landlord's own answer.
  */
  it('still prints the compelled requirements from the variable', () => {
    const { body, variables } = clause('hoa.lease-requirements');

    expect(body).toMatch(/\{\{hoaLeaseRequirements\}\}/);
    expect(variables.map((v) => v.name)).toContain('hoaLeaseRequirements');
  });
});

describe('hoa.amenity-access promises only what the landlord can perform', () => {
  /*
    THE PROMISE NOBODY COULD KEEP. The clause read "Landlord shall register
    Tenant with the association ... in time for Tenant to have access from the
    start date" — an unqualified result obligation whose performance depends on
    a third party AND on the tenant.

    On the first real lease the association's own manager settled it: the form
    is completed BY THE TENANT, and needs his signature, his household's dates
    of birth and his vehicle registrations. The landlord cannot produce any of
    that. The clause also argued with itself — its first sentence says access
    "is not guaranteed by this Lease" and its third guaranteed it by a date.

    Split by who can actually act. The landlord owes what only an owner can
    give; the tenant owes what only an occupant can give; and a late start
    caused by the tenant is the tenant's risk, not a landlord breach.
  */
  it('no longer guarantees access by the start date', () => {
    const { body } = clause('hoa.amenity-access');

    expect(body).not.toMatch(/in time for Tenant to have access from the start date/i);
    expect(body, 'the disclaimer it used to contradict must survive').toMatch(/not guaranteed by this Lease/i);
  });

  it('puts the occupant-side submissions on Tenant, on a deadline from a variable', () => {
    const { body, variables } = clause('hoa.amenity-access');

    expect(body).toMatch(/Tenant shall give the association/i);
    expect(body).toMatch(/\{\{amenityRegistrationDays\}\}/);
    expect(variables.map((v) => v.name)).toContain('amenityRegistrationDays');
  });

  it('makes a late start caused by Tenant not a landlord breach', () => {
    expect(clause('hoa.amenity-access').body).toMatch(/not a failure by Landlord/i);
  });

  /*
    THE TRAP THIS CLAUSE ALREADY DOCUMENTS. One declaration's filing list,
    deadline and managing agent were once stated here as though every
    association had them. The landlord's limb must stay abstract — "whatever it
    requires from the Owner" — or the next community's lease asserts Estancia's
    paperwork.
  */
  it('names no particular association, agent, form or filing deadline', () => {
    const { body, jurisdiction } = clause('hoa.amenity-access');

    expect(jurisdiction).toBe('generic');
    expect(body).toMatch(/whatever it requires from the Owner/i);
    expect(body).not.toMatch(/Estancia|Evergreen|CMG|New Tenant Profile|Gated Tenant/i);
  });
});

describe('cdd.assessments can recover what the district charges', () => {
  /*
    THE ASYMMETRY THE RENDERED LEASE EXPOSED. `hoa.compliance` makes the tenant
    reimburse "any fine or charge levied by the association". The district
    clause said only that the tenant "shall comply with any rule the district
    adopts" — compliance with no consequence, and no way to recover a penny.

    That was survivable while a district meant assessments on the tax bill. It
    stopped being survivable when Estancia's district adopted a fee schedule
    (Resolution 2026-04, 16 December 2025) carrying an administrative
    reimbursement of up to $500 per violation, property damage at actual cost,
    and facility rentals with forfeitable deposits. A district bills the OWNER.
    With no reimbursement limb, every one of those lands on the landlord with
    no route back to the tenant who incurred it.

    A district is a unit of local government, not the association, so this
    cannot be borrowed from `hoa.compliance` — it needs its own limb.
  */
  it('passes district charges back to the tenant who caused them', () => {
    const { body } = clause('cdd.assessments');

    expect(body).toMatch(/reimburse Landlord as an Other Charge/i);
    expect(body).toMatch(/administrative reimbursement/i);
    expect(body).toMatch(/act or omission of Tenant/i);
  });

  /*
    AND THE ONE THAT REACHES THE LANDLORD'S OWN CARDS. Estancia's suspension
    rule (Resolution 2026-05, §11) lets the district deactivate every access
    card associated with an ADDRESS until money owed is paid — so an unpaid
    tenant charge switches off the owner's own access. Districts commonly
    enforce by address rather than by person, so this is stated by effect.
  */
  it('covers a suspension the district applies to the address', () => {
    const { body } = clause('cdd.assessments');

    expect(body).toMatch(/suspend|deactivat|restrict/i);
    expect(body).toMatch(/unpaid|remains unpaid/i);
  });

  it('still states who pays the assessments themselves, from a variable', () => {
    const { body } = clause('cdd.assessments');

    expect(body).toMatch(/\{\{cddAssessmentsPaidBy\}\}/);
    expect(body).toMatch(/Chapter 190/);
  });
});

describe('deposit.escrow-notice honours the exemption inside the subsection it cites', () => {
  /*
    THE CLAUSE WAS RIGHT AND THE GATE WAS WRONG.

    §83.49(2) ends: "This subsection does not apply to any landlord who rents
    fewer than five individual dwelling units." The clause was gated only on
    money being held, so it printed for every landlord — including the
    single-property owner the whole builder is aimed at.

    That is not a harmless extra sentence. It volunteers a 30-day notice duty
    the landlord does not owe, and having volunteered it in the lease, they can
    now breach it. The remedy for the real §83.49(2) is the forfeiture in
    §83.49(3)(a); the remedy for a self-imposed one is whatever a tenant's
    lawyer can make of a promise the landlord wrote and did not keep.

    Deleting the clause was the wrong answer — a landlord with five units owes
    this notice and the library must still emit it. The fact is the answer.
  */
  const selects = (facts: Record<string, unknown>): boolean => {
    const { includeWhen } = clause('deposit.escrow-notice');

    expect(includeWhen, 'the clause must gate itself').toBeTypeOf('function');

    return includeWhen!(facts as never);
  };

  const holdingMoney = { depositHeldUsd: 6900, advanceRentHeldUsd: 6900 };

  it('is not selected for a landlord renting fewer than five units', () => {
    expect(selects({ ...holdingMoney, landlordRentsFiveOrMoreUnits: false })).toBe(false);
  });

  it('is selected once the landlord is inside the subsection', () => {
    expect(selects({ ...holdingMoney, landlordRentsFiveOrMoreUnits: true })).toBe(true);
  });

  it('still requires money actually to be held', () => {
    expect(selects({ depositHeldUsd: 0, advanceRentHeldUsd: 0, landlordRentsFiveOrMoreUnits: true })).toBe(false);
  });
});

describe('hoa.amenity-access bounds what the tenant can be billed', () => {
  /*
    THE RESIDUAL NOBODY OWNED. The allocation sentence is a closed list —
    application, access card, gate device — so a periodic membership or user
    fee falls outside it and is allocated to nobody at all.

    That is not neutral. An association bills the OWNER and looks to the owner
    for a renter's unpaid charges, so an unallocated amenity fee lands on the
    landlord anyway, with an argument attached. Estancia's district adopted a
    non-resident annual user fee of $7,106.32 in Resolution 2026-04, which
    ought not to reach a landowner's tenant at all — but "ought not" plus
    silence is how a five-figure surprise arrives mid-term.

    Saying where the residual sits costs nothing and removes the argument. It
    deliberately does NOT invent an allocation for a fee that should not apply:
    that is a question for the district, not for drafting.
  */
  it('closes the list, so an unnamed amenity charge is not the tenant’s', () => {
    const { body } = clause('hoa.amenity-access');

    expect(body).toMatch(/application, access card or gate device fees/i);
    expect(body).toMatch(/No other charge for the use of the association's amenities is payable by Tenant/i);
  });

  it('still allocates the named fees from a variable, not a literal', () => {
    const { body } = clause('hoa.amenity-access');

    expect(body).toMatch(/\{\{amenityFeesPaidBy\}\}/);
    expect(body.replace(/\{\{amenityFeesPaidBy\}\}/g, '<VAR>')).not.toMatch(
      /gate device fees charged by the association are payable by (Landlord|Tenant)\b/i,
    );
  });
});

describe('hoa.amenity-access survives a change of amenity operator', () => {
  /*
    AMENITIES CHANGE HANDS MID-TERM. At 29090 Picana Ln the pool and clubhouse
    were mid-transfer from the master association to the community development
    district — authorised, not yet conveyed, with two live fee schedules
    disagreeing about the price of an access card. Over eighteen months the
    operator, the rules and the fees could all move.

    Silence invites the argument that the tenant is receiving less than was
    let. Saying so is cheap; the sentence does not have to be fought for later.

    "OF ITSELF" IS LOAD-BEARING. Without it the sentence would also excuse the
    amenities being withdrawn altogether, which is a different thing from a
    change of operator and not something a landlord should be pre-forgiven for.
    A change alone is not an abatement; total loss is left to law.
  */
  it('says a change of operator, rules or fees is not a landlord failure', () => {
    const { body } = clause('hoa.amenity-access');

    expect(body).toMatch(/passes to another body/i);
    expect(body).toMatch(/not a failure by Landlord/i);
  });

  it('does not pre-excuse the amenities disappearing entirely', () => {
    expect(clause('hoa.amenity-access').body).toMatch(/does not of itself reduce the rent/i);
  });
});

describe('rent.base says how rent is paid, not only how much', () => {
  /*
    AMOUNT AND DATE, NEVER METHOD. The clause set $6,900 on day 1 and stopped,
    so the first month of every tenancy began with a phone call asking where to
    send it — and an unpaid rent whose method was never agreed is a poor
    footing for a §83.56(3) notice.

    NO ACCOUNT NUMBERS. The method is named; the credentials are not. This
    document is handed to the association under the declaration's leasing
    section, sits in a management company's file, and is stored in the envelope
    and the database. A routing and account pair in a signed lease is a
    disclosure the landlord cannot recall. "The account Landlord notifies to
    Tenant in writing" is just as enforceable and travels nowhere.
  */
  it('states a payment method, from a variable', () => {
    const { body, variables } = clause('rent.base');

    expect(body).toMatch(/\{\{rentPaymentMethod\}\}/);
    expect(variables.map((v) => v.name)).toContain('rentPaymentMethod');
  });

  it('keeps the amount and the due day', () => {
    const { body } = clause('rent.base');

    expect(body).toMatch(/\{\{monthlyRentUsd\}\}/);
    expect(body).toMatch(/\{\{rentDueDay\}\}/);
  });

  /*
    A guard rather than a hope: nothing that looks like bank credentials may be
    written into the clause text itself by a later edit.
  */
  it('carries no account or routing digits in the clause text', () => {
    expect(clause('rent.base').body).not.toMatch(/\b\d{6,}\b/);
  });
});

describe('insurance.renters has a consequence for letting the cover lapse', () => {
  /*
    AN OBLIGATION WITH NOTHING BEHIND IT. The clause required the cover and
    evidence of it, and said nothing about what happens when it lapses in month
    seven — which is when it lapses. A tenant who simply stops paying the
    premium breaches a term that costs them nothing to breach.

    GENERIC, SO NO STATUTE IS NAMED. North Carolina selects this clause too.
    Calling it a breach engages whichever state's remedy applies; naming
    §83.56(2) here would make it Florida's, which `clause-jurisdictions` pins
    against.

    THE FORCE-PLACED LIMB IS CONFINED TO THE LANDLORD'S OWN INTEREST. A
    landlord has no insurable interest in a tenant's possessions, so a promise
    to insure them would be empty. This buys what can actually be bought and
    bills it through the Other Charge machinery rather than inventing a fee.
  */
  it('makes a lapse a breach', () => {
    const { body } = clause('insurance.renters');

    expect(body).toMatch(/failure to obtain or maintain that cover/i);
    expect(body).toMatch(/is a breach of this Lease/i);
  });

  it('lets the landlord cover their own interest and recover the cost', () => {
    const { body } = clause('insurance.renters');

    expect(body).toMatch(/protecting Landlord's own interest/i);
    expect(body).toMatch(/as an Other Charge/i);
  });

  it('says it without naming one state’s statute', () => {
    const { body, jurisdiction } = clause('insurance.renters');

    expect(jurisdiction).toBe('generic');
    expect(body).not.toMatch(/Fla\. Stat\.|N\.C\. Gen\. Stat\./);
  });
});
