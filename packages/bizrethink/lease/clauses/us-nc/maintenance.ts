import type { Clause } from '../types';

/**
 * North Carolina's maintenance clauses — and the two Florida ones it cannot
 * have.
 *
 * THE STRUCTURAL DIFFERENCE BETWEEN THE TWO STATES LIVES HERE. Fla. Stat.
 * §83.51(2) expressly permits a lease to alter the landlord's obligations under
 * that subsection "for a single-family home or duplex", which is what makes the
 * Florida library's `maintenance.shift-single-family` and
 * `maintenance.tenant-repair-threshold` possible at all.
 *
 * N.C. Gen. Stat. §42-42(b) permits nothing of the kind in the lease. The
 * landlord "is not released of his obligations under any part of this section
 * by the tenant's explicit or implicit acceptance" of a failure to meet them,
 * "whether done before the lease was made, when it was made, or after it was
 * made". The only route it leaves open is a SUBSEQUENT written contract in
 * which the tenant agrees to perform specified work, "supported by adequate
 * consideration other than the letting of the premises" and not made with the
 * purpose or effect of evading the landlord's obligations.
 *
 * A lease is not a subsequent contract, and the letting is the only
 * consideration a lease supplies. So North Carolina gets NO shift clause and NO
 * tenant repair threshold, and the interview does not ask for the two figures
 * that feed them. That is the clearest illustration in this library of the rule
 * the whole jurisdiction split exists for: a Florida clause that exists only
 * because of a Florida statute simply does not travel.
 *
 * Read off ncleg.gov on 2026-09-06:
 *   §42-42  https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_42/GS_42-42.html
 *   §42-43  https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_42/GS_42-43.html
 *   §42-44  https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_42/GS_42-44.html
 */

const drafted = () => ({ kind: 'attorney-drafted' as const, author: null });

export const NC_MAINTENANCE: Clause[] = [
  {
    slug: 'maintenance.landlord-statutory-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 10,
    heading: "Landlord's Maintenance Obligations",
    /*
      §42-42(a)(1)-(4) and (a)(8), in the order the statute puts them.

      THE WRITTEN-NOTICE CONDITION IS THE DIVERGENCE. §42-42(a)(4) makes the
      duty to repair electrical, plumbing, sanitary, heating, ventilating,
      air-conditioning and other supplied facilities conditional on
      "notification of needed repairs ... made to the landlord in writing by the
      tenant, except in emergency situations". Florida imposes no such
      condition. A tenant who telephones about a broken furnace in North
      Carolina has not started the landlord's clock, and a lease that does not
      say so has told them nothing — which is also why this library gives North
      Carolina a clause naming the address that written notice goes to.

      §42-42(a)(8) is separate and is NOT conditioned on notice in writing: an
      imminently dangerous condition must be remedied "within a reasonable
      period of time based upon the severity of the condition" once the landlord
      has actual knowledge OR notice. The statute then enumerates twelve such
      conditions, from unsafe wiring to a lack of an operable toilet. They are
      not reproduced here — the duty is the term, and the list is the statute's
      to keep current.

      DELIBERATELY NOT SUPERSEDABLE, for the same reason the Florida clause is
      not: a lease that let a later clause displace this one could be drafted to
      look as though §42-42(a) had been shifted to the tenant, which §42-42(b)
      does not permit.
    */
    body: 'Landlord shall comply with the current applicable building and housing codes, make all repairs and do whatever is necessary to put and keep the Premises in a fit and habitable condition, keep all common areas of the Premises in safe condition, and maintain in good and safe working order and promptly repair all electrical, plumbing, sanitary, heating, ventilating, air-conditioning and other facilities and appliances Landlord supplies or is required to supply. Except in an emergency, that obligation to repair arises when Tenant notifies Landlord of the needed repair in writing. Landlord shall repair or remedy any imminently dangerous condition on the Premises within a reasonable period of time based upon the severity of the condition, after acquiring actual knowledge of it or receiving notice of it. These obligations are imposed by N.C. Gen. Stat. §42-42(a). Landlord is not released from them by any acceptance by Tenant of a failure to meet them, and nothing in this Lease alters them.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'N.C. Gen. Stat. §42-42(a)',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['landlord-structural-maintenance'],
  },

  {
    slug: 'maintenance.detectors-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 25,
    heading: 'Smoke and Carbon Monoxide Alarms',
    /*
      THIS PAIR POINTS THE OPPOSITE WAY FROM FLORIDA'S ON THE ONE QUESTION THAT
      COSTS MONEY. The Florida clause ends "Nothing in this section makes Tenant
      responsible for repairing or replacing a device itself". North Carolina's
      §42-44(a2) makes the tenant reimburse the landlord's reasonable and actual
      cost of repairing or replacing an alarm that was disabled or damaged other
      than through the landlord's acts or acts of God — and makes a failure to
      reimburse within thirty days an infraction. Merging the two clauses would
      hand one state's tenant the other state's bill.

      Three more things North Carolina has and Florida does not:

        - a FIFTEEN-DAY deadline on the landlord to replace or repair, running
          from written notice from the tenant (§42-42(a)(5), (a)(7));
        - a requirement, since 31 December 2012, that any newly installed or
          replaced smoke alarm be a TAMPER-RESISTANT 10-YEAR LITHIUM BATTERY
          alarm, unless the unit is hardwired with battery backup or the alarm is
          a combined smoke/CO unit meeting (a)(7) (§42-42(a)(5a));
        - an express statement that the tenant's failure to replace batteries
          "shall not be considered as negligence on the part of the tenant or the
          landlord". That sentence protects the tenant and is the statute's own,
          so it is recited rather than left out.

      The carbon monoxide duty is conditional in North Carolina: §42-42(a)(7)
      "applies only to dwelling units having a fossil-fuel burning heater,
      appliance, or fireplace, and in any dwelling unit having an attached
      garage." The condition is stated in the clause rather than asked as an
      interview question — a lease that recites the statutory trigger is correct
      for every property, and asking would be a fifth new question for no gain.
    */
    body: 'Landlord shall provide operable smoke alarms and shall ensure that a smoke alarm is operable and in good repair at the beginning of the tenancy, as N.C. Gen. Stat. §42-42(a)(5) requires. When installing a new smoke alarm or replacing an existing one, Landlord shall install a tamper-resistant, 10-year lithium battery smoke alarm, except where §42-42(a)(5a) does not require it. Where the Premises have a fossil-fuel burning heater, appliance or fireplace, or an attached garage, Landlord shall provide at least one operable carbon monoxide alarm per level and shall ensure it is operable and in good repair at the beginning of the tenancy, as §42-42(a)(7) requires. Landlord shall place new batteries in each battery-operated alarm at the beginning of the tenancy, and Tenant shall replace those batteries as needed during the tenancy, except in a tamper-resistant, 10-year lithium battery smoke alarm. A failure by Tenant to replace the batteries is not negligence on the part of either party. Tenant shall notify Landlord in writing of the need to replace or repair any alarm, and Landlord shall replace or repair it within 15 days of receiving that notice. Tenant shall not render any alarm inoperable, and shall reimburse Landlord the reasonable and actual cost of repairing or replacing an alarm that is disabled or damaged other than through the acts of Landlord or Landlord’s agents or acts of God.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'N.C. Gen. Stat. §42-42(a)(5)',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['detector-duty'],
  },
];
