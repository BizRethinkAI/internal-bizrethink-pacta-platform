import type { Clause } from '../types';

/**
 * Notices and the two general clauses North Carolina needs of its own.
 *
 * The generic tier already carries entire agreement, severability, execution and
 * the tenant's address for notices, so what is here is only what Florida's
 * versions could not travel with.
 */

const drafted = () => ({ kind: 'attorney-drafted' as const, author: null });

export const NC_BOILERPLATE: Clause[] = [
  {
    slug: 'notices.method-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'notices',
    sortKey: 10,
    heading: 'Notices',
    /*
      NORTH CAROLINA IS SIMPLER HERE, AND THAT IS THE FINDING.

      Florida's notices clause has to refuse e-mail unless the parties have
      signed the separate addendum Fla. Stat. §83.505 prescribes — an addendum
      with two mirrored elections, two designated addresses and two revocation
      sentences, which is a whole clause of its own in the Florida library.

      Chapter 42 contains no equivalent. Nothing in it conditions electronic
      delivery of a notice between landlord and tenant on a signed election, so
      a North Carolina lease may simply agree that e-mail works, and North
      Carolina gets one clause where Florida needs two.

      The last sentence is the boundary. Service of the summons and complaint in
      a summary ejectment proceeding is governed by §42-29 and the Rules of
      Civil Procedure, not by what a lease agrees between the parties, and a
      clause that did not say so would read as though it were.
    */
    body: 'A notice under this Lease must be in writing and is validly given if delivered by hand, sent by post to the address given for that party in this Lease, or sent by e-mail to the address given for that party in this Lease. A notice sent by post is treated as received on the fifth day after posting. A notice sent by e-mail is treated as received on the day it is sent, unless it is returned to the sender as undeliverable. Either party may change its address for notices by giving notice in the manner set out in this section. Nothing in this section affects the manner of service required by Chapter 42 of the General Statutes in a proceeding for summary ejectment.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['notice-method'],
  },

  {
    slug: 'notices.landlord-address-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'notices',
    sortKey: 15,
    heading: 'Where to Send Written Notice to Landlord',
    /*
      THE SAME INFORMATION AS FLORIDA'S §83.50 CLAUSE, FOR A COMPLETELY
      DIFFERENT REASON — which is why it is a separate clause with a separate
      citation rather than the Florida one relabelled.

      Florida COMPELS the disclosure: §83.50 requires the landlord's name and
      address to be given in writing, and `whyThisClause` reports that clause as
      compelled by statute. North Carolina compels nothing of the kind, and
      §42-44(c1) rather points the other way, contemplating a lease that does not
      identify the landlord at all.

      What makes it matter in North Carolina is the reverse dependency:
      §42-42(a)(4) makes the landlord's repair duty arise on the tenant's
      WRITTEN notice, and §42-43(a)(7) requires written notice about an alarm.
      A tenant who cannot tell where written notice goes cannot start either
      clock. So this clause exists to make the tenant's own remedy usable, not
      to discharge a disclosure duty, and it is our drafting rather than the
      statute's — it carries `requiredBy` to record which duty it serves and is
      classified as implementing rather than compelled.
    */
    body: 'Written notice to Landlord under this Lease, including notice of a needed repair under N.C. Gen. Stat. §42-42(a)(4) and notice about a smoke alarm or carbon monoxide alarm under N.C. Gen. Stat. §42-43(a)(7), is to be given to {{ncNoticeName}} at {{ncNoticeAddress}}. Landlord shall notify Tenant in writing if that name or address changes.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'N.C. Gen. Stat. §42-42(a)(4)',
    includeWhen: null,
    variables: [
      { name: 'ncNoticeName', type: 'string', label: 'Who receives written notice for the landlord', required: true },
      { name: 'ncNoticeAddress', type: 'string', label: 'At what address', required: true },
    ],
    supersedes: [],
    asserts: ['landlord-identity-disclosed'],
  },

  {
    slug: 'general.waiver-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'general',
    sortKey: 30,
    heading: 'No Waiver',
    /*
      THIS CLAUSE IS SHORT BECAUSE OF WHAT IT LEAVES OUT.

      Florida's version carries a sentence about acceptance of rent, and has to:
      Fla. Stat. §83.56(5) makes accepting rent with actual knowledge of a
      noncompliance a WAIVER of the right to act on it, and §83.47(1)(a) voids
      any term purporting to say otherwise, so the Florida clause can claim only
      the statute's own carve-out for subsequent or continuing noncompliance.

      North Carolina has no such provision, and §42-26(c) runs the opposite way
      — a lease MAY provide that accepting partial rent does not waive the
      breach for which reentry was reserved. Carrying Florida's sentence here
      would tell a North Carolina tenant something Chapter 42 does not say, and
      would give away a right §42-26(c) offers. So the rent point lives in
      `default.notices-nc`, where its statute puts it, and this clause says
      nothing about rent at all.

      A test asserts that absence, because the obvious tidy-up on meeting two
      clauses called "No Waiver" is to keep the longer one.
    */
    body: 'A failure or delay by either party in enforcing any provision of this Lease is not a waiver of that provision or of any other, and does not prevent that party from enforcing it later.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['no-waiver'],
  },

  {
    slug: 'general.governing-law-nc',
    version: 1,
    jurisdiction: 'US-NC',
    placement: 'lease-body',
    section: 'general',
    sortKey: 40,
    heading: 'Governing Law',
    /*
      `venueCounty` was a Florida-only interview question until this clause
      existed, and it stops being one because of it — the derived marking in
      `interview-jurisdiction.test.ts` computes that from the library rather than
      from a list anyone maintains, so adding this clause is what unmarks the
      field. Its label lost the word "Florida" in the same change.
    */
    body: 'This Lease is governed by the law of the State of North Carolina, and in particular Chapter 42 of the General Statutes. The venue for any proceeding arising out of this Lease is {{venueCounty}} County, North Carolina.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [{ name: 'venueCounty', type: 'string', label: 'County for venue', required: true }],
    supersedes: [],
    asserts: ['governing-law'],
  },
];
