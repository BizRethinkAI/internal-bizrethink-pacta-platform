import type { Clause } from '../types';

/**
 * The closing provisions. Short, but two of them are doing real work rather
 * than filling space.
 *
 * `general.entire-agreement` is the reason the clause graph has to get
 * duplication right: an integration clause makes the written document the whole
 * bargain, so anything the builder silently drops is simply gone, and anything
 * it states twice in slightly different words is a conflict with no external
 * context to resolve it.
 *
 * `general.governing-law` fixes venue in the county where the property sits,
 * which is where a Florida eviction is actually filed.
 *
 * Tier 3, `attorney-drafted, author: null` — drafted here, not yet reviewed,
 * cannot render outside a BizRethink-internal organisation.
 */

const drafted = () => ({ kind: 'attorney-drafted' as const, author: null });

export const FL_BOILERPLATE: Clause[] = [
  {
    slug: 'notices.method',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'notices',
    sortKey: 10,
    heading: 'Notices',
    /*
      Email was removed as an unconditional method. §83.505 permits electronic
      delivery of notices under this part ONLY where the parties have signed a
      separate addendum in substantially the form the statute prescribes,
      stating that the election is voluntary and revocable.

      The previous wording simply declared email valid. That is worse than an
      omission: it grants what the statute conditions, and a tenant could rely
      on it. Electing electronic delivery now selects
      `notices.electronic-delivery`, which is that addendum.
    */
    body: 'A notice under this Lease must be in writing and is validly given if delivered by hand or sent by post to the address given for that party in this Lease. A notice sent by post is treated as received on the fifth day after posting. Notices may be delivered by email only where the parties have signed the electronic delivery addendum required by Fla. Stat. §83.505. Either party may change its address for notices by giving notice in the manner set out in this section. Nothing in this section affects the manner of service required by Fla. Stat. §83.56 for a statutory notice.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['notice-method'],
  },

  {
    slug: 'notices.tenant-address',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'notices',
    sortKey: 20,
    heading: "Tenant's Address for Notices",
    body: 'Before the start date, notices to Tenant are to be sent to {{tenantPreTermAddress}}. From the start date, notices to Tenant are to be sent to the Premises unless Tenant gives Landlord a different address in writing.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [
      {
        name: 'tenantPreTermAddress',
        type: 'string',
        label: "Tenant's address before the term starts",
        required: true,
      },
    ],
    supersedes: [],
    asserts: ['tenant-notice-address'],
  },

  /*
    §83.505 prescribes TWO MIRRORED ELECTIONS — landlord and tenant — each with
    two checkboxes, its own designated address and its own revocation sentence.
    Read off the statute on 2026-09-03:
    https://www.flsenate.gov/Laws/Statutes/2025/0083.505

    What we had asserted both parties had elected: "Landlord elects to receive
    notices by email at: X". A tenant who did not want e-mail had no way to say
    so, and a party who never chose was recorded as having chosen.

    This is the THIRD clause found with one option where the statute prescribes
    two, after §83.595(4). The pattern is ours, not Florida's: offered a choice,
    we rendered the branch we expected instead of the choice.

    Getting this wrong is not cosmetic. Without a valid addendum, e-mail service
    of a §83.56(3) three-day notice is invalid, and the deposit disclosure now
    cross-references this section too.
  */
  {
    slug: 'notices.electronic-delivery',
    version: 1,
    jurisdiction: 'US-FL',
    // Its own signed addendum, because the statute requires exactly that.
    placement: 'addendum',
    section: 'notices',
    sortKey: 30,
    heading: 'Electronic Delivery of Notices Addendum',
    /*
      Fla. Stat. §83.505 prescribes a form "substantially" like this: each party
      elects separately, provides an email address, and is told in the document
      that the election is voluntary and revocable at any time.

      Offered only when elected. A landlord who does not want email notice
      should not be handed an addendum inviting it.
    */
    body: "Fla. Stat. §83.505 permits notices required under Part II of Chapter 83 to be delivered by e-mail only where both parties have signed an addendum agreeing to it and each has given a valid e-mail address. This is that addendum. THIS ELECTION IS VOLUNTARY. Either party may revoke it, or update the address given, at any time.\n\nLANDLORD ELECTION. Notices from a tenant may contain time-sensitive information about the tenant's housing. The election to receive notices from the tenant by e-mail is voluntary.\n[ ] I, {{landlordNames}}, the landlord or the landlord's agent, agree to receive notices required by this Lease or under Part II of Chapter 83, Florida Statutes, from the tenant by e-mail. I designate the following e-mail address for receipt of notices from the tenant: {{landlordNoticeEmails}}.\n[ ] I do not agree to receive notices by e-mail.\nI may revoke my agreement to receive notices by e-mail by providing written notice to the tenant, which is effective upon delivery and does not affect the validity of any notice already sent by e-mail. I may update my e-mail address at any time by providing written notice to the tenant specifying the new address, which takes effect upon delivery.\n\nTENANT ELECTION. Notices from a landlord may contain time-sensitive information about your housing. The election to receive notices from the landlord by e-mail is voluntary.\n[ ] I, {{tenantNames}}, the tenant, agree to receive notices required by this Lease or under Part II of Chapter 83, Florida Statutes, from the landlord by e-mail. I designate the following e-mail address for receipt of notices from the landlord: {{tenantNoticeEmails}}.\n[ ] I do not agree to receive notices by e-mail.\nI may revoke my agreement to receive notices by e-mail by providing written notice to the landlord, which is effective upon delivery and does not affect the validity of any notice already sent by e-mail. I may update my e-mail address at any time by providing written notice to the landlord specifying the new address, which takes effect upon delivery.\n\nA notice sent by e-mail is delivered when sent, unless it is returned to the sender as undeliverable. The sender shall keep a copy of the notice and evidence of its transmission.",

    source: drafted(),
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.505',
    includeWhen: (facts) => facts.electronicNoticesElected,
    variables: [
      /*
        Derived from the party list, not asked. §83.505 requires a valid email
        address for EACH party, and the single-field version could not
        represent two tenants — it named one and the second had elected
        nothing. One address per signer already exists, and the party list
        already refuses two people sharing one.
      */
      { name: 'landlordNames', type: 'string', label: 'Landlord name(s)', required: true },
      { name: 'tenantNames', type: 'string', label: 'Tenant name(s)', required: true },
      { name: 'landlordNoticeEmails', type: 'string', label: 'Landlord notice addresses', required: true },
      { name: 'tenantNoticeEmails', type: 'string', label: 'Tenant notice addresses', required: true },
    ],
    supersedes: [],
    asserts: ['electronic-notice-elected'],
  },

  {
    slug: 'general.entire-agreement',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'general',
    sortKey: 10,
    heading: 'Entire Agreement',
    /*
      An integration clause is what makes the rest of this engine matter. It
      makes the written document the whole bargain, so a term the builder failed
      to include is simply not part of the deal, and two clauses saying nearly
      the same thing conflict with nothing outside the document to resolve them.
      That is the case for duplicate-assertion detection, stated in the lease.
    */
    body: 'This Lease, together with the addenda and disclosures attached to or delivered with it, is the entire agreement between the parties about the Premises and replaces any prior agreement, representation or understanding, whether written or oral. It may be varied only in writing signed by the party to be bound. Where an addendum conflicts with the body of this Lease, the body prevails unless the addendum says otherwise.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['entire-agreement'],
  },

  {
    slug: 'general.severability',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'general',
    sortKey: 20,
    heading: 'Severability',
    body: 'If any provision of this Lease is held to be invalid or unenforceable, that provision is to be read down to the extent necessary to make it valid, or if it cannot be, severed. The remaining provisions continue in full force.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['severability'],
  },

  {
    slug: 'general.waiver',
    /*
      v2: the clause said acceptance of a payment with knowledge of a breach was
      not a waiver of that breach. Fla. Stat. §83.56(5) says the opposite —
      accepting rent with actual knowledge WAIVES the right to terminate or sue
      for that noncompliance — and §83.47(1)(a) voids a term purporting to
      waive a right the part confers. What survives is the statute's own
      carve-out for subsequent or continuing noncompliance, which is now all
      this claims.
    */
    version: 2,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'general',
    sortKey: 30,
    heading: 'No Waiver',
    body: 'A failure or delay by either party in enforcing any provision of this Lease is not a waiver of that provision or of any other, and does not prevent that party from enforcing it later. Except as Fla. Stat. \u00a783.56(5) provides otherwise, acceptance of rent does not waive a subsequent or continuing noncompliance.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['no-waiver'],
  },

  {
    slug: 'general.governing-law',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'general',
    sortKey: 40,
    heading: 'Governing Law',
    // Venue is the county the property sits in, which is where a Florida
    // eviction is actually filed. Interpolated rather than hard-coded so the
    // clause is correct for a property outside Pasco County.
    body: 'This Lease is governed by the law of the State of Florida, and in particular Part II of Chapter 83 of the Florida Statutes. The venue for any proceeding arising out of this Lease is {{venueCounty}} County, Florida.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [{ name: 'venueCounty', type: 'string', label: 'County for venue', required: true }],
    supersedes: [],
    asserts: ['governing-law'],
  },

  {
    slug: 'general.execution',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'general',
    sortKey: 50,
    heading: 'Execution',
    body: 'Each party consents to the execution of this Lease and its addenda by electronic signature. A copy delivered electronically has the same effect as an originally signed copy. This Lease may be executed in counterparts, each of which is an original and all of which together are one agreement. The effective date is the date of the last signature.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['electronic-execution'],
  },
];
