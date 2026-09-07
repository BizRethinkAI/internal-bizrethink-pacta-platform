import type { Clause } from '../types';

/**
 * Entry, default, and what happens to what a tenant leaves behind.
 *
 * All three diverge sharply from Florida, and one of them diverges by being
 * about an ABSENCE — which is the harder kind to notice.
 *
 * Read off ncleg.gov on 2026-09-06:
 *   §42-3     https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_42/GS_42-3.html
 *   §42-25.7  https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_42/GS_42-25.7.html
 *   §42-25.9  https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_42/GS_42-25.9.html
 *   §42-26    https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_42/GS_42-26.html
 */

const drafted = () => ({ kind: 'attorney-drafted' as const, author: null });

export const NC_USE_AND_REMEDIES: Clause[] = [
  {
    slug: 'access.entry-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'access',
    sortKey: 10,
    heading: "Landlord's Access",
    /*
      NO CITATION, AND THE ABSENCE IS THE FINDING.

      Fla. Stat. §83.53 does three things: it closes the list of people a tenant
      must admit, it sets a notice floor of 24 hours, and it fixes 7:30am to
      8:00pm as the reasonable hours. Chapter 42 has no landlord-entry provision
      at all — Article 5 imposes duties on the landlord and the tenant and says
      nothing about entering, and the closest thing in the Chapter is §42-42.3,
      which is about changing locks for a victim of domestic violence.

      So the notice period here is the parties' agreement rather than a floor
      above a statutory minimum, the clause carries no `requiredBy`, and
      `whyThisClause` reports it as our drafting — which is exactly right and
      is the label a reviewing attorney should see on it.

      THE LAST SENTENCE IS DOING THE WORK Florida's statute does. With no
      statutory list to point at, an entry clause that merely enumerates
      purposes leaves open whether other purposes are permitted. Confining entry
      to the purposes named is how the clause closes its own list.
    */
    body: "Landlord may enter the Premises at reasonable times, having given Tenant at least {{ncEntryNoticeHours}} hours' notice, in order to inspect the Premises, make or arrange repairs or improvements, supply agreed services, or show the Premises to a prospective or actual purchaser, mortgagee, tenant, worker or contractor. Notice is not required in an emergency, or where Tenant has consented to the entry. Landlord shall not enter for any purpose not set out in this section.",
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [{ name: 'ncEntryNoticeHours', type: 'number', label: 'Notice hours before entry', required: true }],
    supersedes: [],
    asserts: ['landlord-entry'],
  },

  {
    slug: 'default.notices-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'default',
    sortKey: 10,
    heading: 'Default',
    /*
      THREE THINGS, AND THE MIDDLE ONE IS THE REASON THIS CLAUSE MUST EXIST.

      §42-3 implies a forfeiture of the term on failure to pay rent within ten
      days after the lessor demands all past-due rent, and lets the lessor enter
      "without having declared such forfeiture or reserved the right of reentry
      in the lease". That covers unpaid rent and nothing else.

      §42-26(a)(2) is what covers everything else, and it is conditional on the
      LEASE: a tenant may be removed "when the tenant or lessee ... has done or
      omitted any act by which, ACCORDING TO THE STIPULATIONS OF THE LEASE, his
      estate has ceased". A North Carolina lease with no forfeiture or reentry
      stipulation gives the landlord no summary-ejectment ground for a
      non-monetary breach at all. Florida needs no equivalent because §83.56(2)
      supplies the remedy by statute.

      §42-26(c) is the third, and it is another remedy available only to a lease
      that asks: the lease MAY provide that acceptance of partial rent or a
      partial housing subsidy payment does not waive the breach for which the
      right of reentry was reserved. Florida's law runs the other way —
      §83.56(5) makes acceptance of rent with actual knowledge a waiver — which
      is why North Carolina's waiver clause says nothing about rent and this one
      does.

      THE APPLICATION-OF-PAYMENTS SENTENCE tracks §42-26(b), including its
      carve-out. The Florida clause applies payments to rent first and then to
      Other Charges, full stop; §42-26(b) adds "unless otherwise designated by
      the tenant", and dropping those five words would take a choice away from
      the tenant that the statute gives them.

      AND THE LAST SENTENCE is §42-25.6, which makes the ejectment procedure a
      matter of public policy rather than of agreement.
    */
    body: 'If Tenant fails to pay rent when due, Landlord may demand all past-due rent, and the term of this Lease is forfeited if the rent is not paid within 10 days after that demand, as N.C. Gen. Stat. §42-3 provides. Landlord reserves a right of reentry, and Tenant’s estate under this Lease ceases, if Tenant breaches any other material obligation under this Lease and does not cure that breach within {{ncCureDays}} days after Landlord gives Tenant written notice of it. Landlord’s acceptance of partial rent, or of a partial housing subsidy payment, does not waive the breach for which that right of reentry is reserved, as N.C. Gen. Stat. §42-26(c) permits this Lease to provide. Sums payable by Tenant under this Lease other than the monthly rent are Other Charges and are not rent; a payment received from Tenant is applied first to rent and then to Other Charges, unless Tenant designates otherwise. An arrear for water, sewer or electric service supplied under N.C. Gen. Stat. §42-42.1 is not a ground for terminating this Lease. Landlord shall recover possession of the Premises only in accordance with Article 3 or Article 7 of Chapter 42 of the General Statutes.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'N.C. Gen. Stat. §42-3',
    includeWhen: null,
    variables: [{ name: 'ncCureDays', type: 'number', label: 'Days to cure a non-monetary breach', required: true }],
    supersedes: [],
    asserts: ['default-notices'],
  },

  {
    slug: 'moveout.personal-property-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'default',
    sortKey: 21,
    heading: 'Personal Property Left Behind',
    /*
      THE PAIR THAT POINTS IN OPPOSITE DIRECTIONS, and the clearest case in this
      library for why a clause may not be parameterised across states.

      Fla. Stat. §83.67(5) OFFERS the landlord relief from the §715.104 duty to
      store and dispose of a tenant's property, in exchange for a prescribed
      all-caps legend in the lease. The Florida clause therefore TAKES a right,
      and the legend is the price of it.

      North Carolina offers nothing of the kind. §42-25.7 makes distress and
      distraint contrary to the public policy of the State outright, and
      §42-25.9 prescribes the whole procedure — the seven days after a writ, the
      $750 and $500 thresholds, the notice of sale, the surplus. None of it is
      waivable by agreement and none of it is ours to restate as a term.

      So the North Carolina clause DISCLAIMS rather than reserves. It says what
      Landlord will do, which is a covenant, and it does not attempt to
      reproduce a statutory procedure that the General Assembly amends and this
      library would then carry stale.
    */
    body: 'Landlord shall deal with any personal property Tenant leaves at the Premises only as Article 2A of Chapter 42 of the General Statutes permits. Nothing in this Lease authorises Landlord to seize, hold, sell or dispose of Tenant’s personal property, or to interfere with Tenant’s access to it, in any other manner, and Landlord shall not distrain upon it.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'N.C. Gen. Stat. §42-25.7',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['personal-property-storage'],
  },
];
