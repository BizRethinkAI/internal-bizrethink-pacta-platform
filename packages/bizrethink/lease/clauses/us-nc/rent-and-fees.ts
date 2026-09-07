import type { Clause } from '../types';

/**
 * The two clauses N.C. Gen. Stat. §42-46 governs.
 *
 * §42-46 is the most consequential section in Chapter 42 for a lease, and it
 * works in both directions at once. It CAPS what a landlord may charge, in
 * figures fixed to the penny and the percentage point; and it makes several
 * charges available ONLY "pursuant to a written lease", so a lease that omits
 * them forfeits them entirely. §42-46(h)(4) then makes any provision contrary
 * to the section "against the public policy of this State and therefore void
 * and unenforceable".
 *
 * That combination is why both clauses below exist rather than one. The late
 * fee has to be capped and floored; the litigation fees have to be reserved or
 * they are gone.
 *
 * Read off ncleg.gov on 2026-09-06, current through the 2024 and 2025 sessions
 * (S.L. 2024-47, 2025-45, 2025-52, 2025-54, all of which amended this section):
 *   https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_42/GS_42-46.html
 *
 * NOTHING NUMERIC ENFORCES THESE. The rule pack — `lease/rule-packs/us-fl.ts`
 * — is Florida's and its TYPE is Florida-shaped: it has fields for a deposit
 * return deadline and an entry-notice floor and none for a late-fee ceiling
 * expressed as the greater of a dollar figure and a percentage. So the caps
 * live in the clause text, where a landlord reads them, and a landlord who
 * enters a fee above the cap gets a lease that recites the cap and then exceeds
 * it with nothing objecting. That gap is named in the PR, not papered over.
 */

const drafted = () => ({ kind: 'attorney-drafted' as const, author: null });

export const NC_RENT_AND_FEES: Clause[] = [
  {
    slug: 'rent.late-fee-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'rent',
    sortKey: 44,
    heading: 'Late Payment',
    /*
      THE FLOOR IS IN THE SENTENCE, not only in the answer.

      §42-46(a) makes a late fee "chargeable only if any rental payment is five
      calendar days or more late, with the first day being the day after the
      rent was due". The interview asks the landlord for a grace period, and a
      landlord may lawfully be more generous than the statute — so the clause
      honours their answer and then refuses to charge earlier than the fifth
      day whatever they typed. Same shape as the Florida entry clause, which
      interpolates a notice period above the §83.53(2) floor.

      THE WATER AND SEWER CARVE-OUT is §42-46(d), and it is the kind of thing a
      lease misses because it sits in a subsection about something else: a
      landlord billing for water or sewer under §62-110(g) may not charge a late
      fee on that arrear. §42-26(b) is its companion — the same arrear may not
      found an eviction — and lives in the default clause.

      SUPERSEDES BOTH GENERIC LATE-FEE CLAUSES. §42-46(b) permits one late fee
      for each late rental payment, so the tiered variant cannot render in North
      Carolina at all. Superseding rather than deleting keeps both clauses
      available to every other state.
    */
    body: 'If rent is not paid in full by the end of day {{graceDays}} after it falls due, and in no event before the rental payment is five calendar days or more late counting from the day after the rent was due, Tenant shall pay a late fee of {{lateFeeUsd}} as an Other Charge. N.C. Gen. Stat. §42-46(a)(1) limits that fee to fifteen dollars ($15.00) or five percent (5%) of the monthly rent, whichever is greater. A late fee may be imposed only once for each late rental payment, and may not be deducted from a subsequent rental payment so as to cause that payment to be in default. No late fee is payable in respect of any amount Tenant owes for water or sewer service. Acceptance of a late payment does not waive Landlord’s right to require payment on the due date.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'N.C. Gen. Stat. §42-46(a)',
    includeWhen: null,
    variables: [
      { name: 'graceDays', type: 'number', label: 'Grace days', required: true },
      { name: 'lateFeeUsd', type: 'usd', label: 'Late fee', required: true },
    ],
    supersedes: ['rent.late-fee-flat', 'rent.late-fee-tiered'],
    asserts: ['late-fee'],
  },

  {
    slug: 'fees.litigation-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'default',
    sortKey: 30,
    heading: 'Fees and Costs on a Default',
    /*
      THE SAME SHAPE AS Fla. Stat. §83.67(5): a remedy the statute offers only
      to a lease that asks for it. §42-46(e), (f) and (g) each open "Pursuant to
      a written lease", and §42-46(i)(3) conditions attorneys' fees on one too.
      A North Carolina lease that omits this clause is not a neutral lease — it
      is a lease that has given up four things, and nothing would ever have said
      so. That is the shape the Florida statutory walk found twice and the
      reason this is here.

      EVERY FIGURE IS THE STATUTE'S. Five percent or fifteen dollars for the
      complaint-filing fee, ten percent for the court appearance, twelve for a
      second trial, fifteen for attorneys' fees. The library's boundary rule
      permits a fixed figure only where a statute, regulation or approved form
      fixes it, and each of these is §42-46's own.

      THE LIMITS ARE IN THE CLAUSE TOO, and deliberately. §42-46(h)(1) allows
      the landlord to charge and retain only ONE of the three administrative
      fees for any one complaint; (h)(2) bars deducting an earned fee from a
      later rent payment or treating non-payment of it as a default founding the
      next ejectment; (h)(5) calculates every fee on the tenant's share where the
      rent is subsidised. A clause that reserved the fees and omitted the limits
      would be a clause §42-46(h)(4) voids.

      ALWAYS INCLUDED, which is a decision rather than a default — recorded in
      the PR. There is no election for it, because every figure is a statutory
      maximum and a lease that reserves them can still choose not to charge
      them, whereas a lease that omits them cannot later choose to.
    */
    body: 'N.C. Gen. Stat. §42-46 makes the following available only where a written lease provides for them, and this Lease provides for them. Where Tenant was in default, Landlord filed and served a complaint for summary ejectment or money owed, Tenant cured the default or claim, and Landlord dismissed the complaint before judgment, Tenant shall pay an administrative complaint-filing fee of fifteen dollars ($15.00) or five percent (5%) of the monthly rent, whichever is greater. Where Tenant was in default and Landlord filed, served and successfully prosecuted such a complaint in the small claims court, Tenant shall pay an administrative court-appearance fee of ten percent (10%) of the monthly rent. Where a new trial follows an appeal from the judgment of a magistrate, and Landlord proves Tenant was in default and prevails, Tenant shall pay a second administrative trial fee of twelve percent (12%) of the monthly rent. Landlord may charge and retain only one of these three fees for any one complaint, may not deduct any of them from a subsequent rental payment, and may not treat a failure to pay one as a default founding a subsequent action for summary ejectment. In addition, Tenant shall pay Landlord’s actual out-of-pocket filing fees charged by the court, the costs of service of process, and reasonable attorneys’ fees actually paid or owed, not exceeding fifteen percent (15%) of the amount owed by Tenant, or fifteen percent (15%) of the monthly rent where the eviction is based on a default other than the nonpayment of rent. Where the rent is subsidised by a government body, each fee under this section is calculated on Tenant’s share of the contract rent only.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'N.C. Gen. Stat. §42-46',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['litigation-fees'],
  },
];
