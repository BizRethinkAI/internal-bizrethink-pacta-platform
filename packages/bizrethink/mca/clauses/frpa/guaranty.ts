import type { McaClause } from '../types';

/**
 * Sections 9 and 10 — the personal guaranty and service of process.
 *
 * TEN OF THE ELEVEN HAVE BEEN REWRITTEN, under
 * [ADR 0012](../../../../../docs/adr/0012-the-baseline-document-is-input-not-specification.md).
 * The `guaranty` cluster did §§9.2, 9.4, 9.5, 9.6, 10.2 and 10.4 on 2026-09-10;
 * `disputes-service` did §§10.1, 10.3, 10.5 and 10.6 later the same day. §9.1 is
 * a field group nobody's brief names and still prints v4's grid.
 *
 * **SECTION 10 IS NOW ONE RULE WITH FIVE POINTERS AT IT.** §10.1 states how
 * judicial process is served and applies to every party including each
 * Guarantor; §§10.2-10.6 each add a designation, a duty or a boundary, and none
 * of them states a second rule. That
 * was the memo's disposition for the whole Section and it is the reason §10.2's
 * note flagged a risk — it asserted §10.1 "applies to each party" while §10.1
 * still said "Merchant". The rewrite of §10.1 makes that sentence true.
 * `a-default-judgment-needs-a-served-defendant.test.ts` holds the property.
 *
 * THE CLUSTER IS FIVE CLAUSES IN THREE FILES, AND THAT IS THE POINT. §9.2 is
 * the product — a guaranty limited to fraud, materially false present-fact
 * statements and intentional diversion, with business failure, insolvency and
 * bankruptcy expressly excluded, which is genuinely better than the three MCA
 * forms filed as SEC exhibits in 2024-2026. Four other clauses gave it back:
 * §7.9's indemnity (`miscellaneous.ts`), §9.4's clawback reinstatement,
 * §§5.11 and 5.13's absolute warranties and Section 5's lead-in
 * (`representations.ts`). Closing four of the five moves the leak; it does not
 * shrink it.
 *
 * `__tests__/personal-liability-is-section-9-only.test.ts` is what holds them
 * together. It states the property over the SET — no clause outside Section 9
 * creates personal liability, and the Guaranty reaches only the guarantor's own
 * proved conduct — because a clause-by-clause assertion passed on all five
 * members of the defect. It was red on 28 of its 84 assertions before these
 * bodies existed.
 *
 * FOUR OF ITS ASSERTIONS WERE GREEN ON THE FIRST RUN, DELIBERATELY KEPT. Two
 * are v4's express insolvency and bankruptcy exclusions, one is §9.2's citation
 * of §5.17, and one is that §7.9 is ungated. Each names something that must
 * SURVIVE the rewrite rather than something the rewrite must add, so each could
 * have gone red and is evidence. Nothing in the file passes because it can
 * never fail — every detector is proved able to fire against the v4 sentence it
 * was written to catch.
 *
 * THE GUARANTY IS NOW AN INTERVIEW ANSWER. `McaFacts.guarantyScope` existed
 * with nothing reading it, so a funder could answer `none` and still be handed
 * a personal guaranty. §§9.2, 9.4, 9.5 and 9.6 are gated on it; see the note on
 * §9.4 for why all four went to `limited-conduct` rather than the wider gate
 * the owner's mid-flight instruction suggested for three of them.
 */
export const FRPA_GUARANTY: McaClause[] = [
  {
    slug: 'frpa.guarantor-information-9-1',
    version: 1,
    instrument: 'frpa',
    kind: 'field-group',
    /*
      A GUARANTY THAT DOES NOT EXIST COLLECTS NO SOCIAL SECURITY NUMBER.

      This was `null` — ungated — while §§9.2–9.6 gate on `guarantyScope`. Under
      `none` the whole section dropped except this grid, which asks a natural
      person for their home address and Social Security number in support of a
      guaranty the assembled document does not contain. Collecting identity data
      for an obligation that does not exist is a privacy defect before it is a
      drafting one, and nothing in the rendered document would have shown it.

      Found by the guaranty cluster, which correctly left it alone as outside its
      brief, and closed here.

      `full-performance` is NOT fixed by this gate and is not meant to be: that
      funder has a guaranty, so the grid belongs, but §§9.2–9.6 are unauthored.
      A gate cannot close that; only drafting the full-performance guaranty can.
    */
    includeWhen: (facts) => facts.guarantyScope !== 'none',
    number: '9.1',
    section: 'guaranty',
    sortKey: 10,
    heading: 'Guarantor Information',
    body: '',
    /*
      Six blanks, «35»-«40», exactly as Section 9 prints them. The body stays
      empty and that is now a statement rather than an omission: this section
      holds a table, and `kind` says so.

      Title is the one optional field. A guarantor signing in a personal
      capacity may hold no office, and the 2026-09-09 counsel memo asks for
      corporate and personal capacity to be kept distinct rather than merged.

      The SSN is collected here and MUST NOT be reproduced in distributed
      copies; the same memo raises it. Nothing in this package distributes
      anything, so that is a rendering obligation recorded where the field is.

      UNGATED, AND THAT IS A GAP THIS CLUSTER COULD NOT CLOSE. No brief names
      §9.1, so it is nobody's to edit, and it is the one Section 9 record that
      is not selected by `guarantyScope`. A funder answering `none` therefore
      still gets a guarantor-identity grid, collecting a Social Security Number
      for a guaranty the document does not contain. Reported rather than fixed.
    */
    fields: [
      { label: 'Full Name', widget: '«35»', kind: 'text', required: true },
      { label: 'Title', widget: '«36»', kind: 'text', required: false },
      { label: 'Social Security Number', widget: '«37»', kind: 'ssn', required: true },
      { label: 'Home Address', widget: '«38»', kind: 'text', required: true },
      { label: 'Phone', widget: '«39»', kind: 'text', required: true },
      { label: 'Email', widget: '«40»', kind: 'text', required: true },
    ],
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['frpa-guarantor-widget-bound-to-merchant'] },
      { review: 'REVIEW-02', findings: ['frpa-9-5-refers-to-guarantors-the-form-cannot-collect'] },
    ],
  },
  /*
    THE BEST TERM IN THIS DOCUMENT, AND THE ONE MOST NEARLY LOST.

    WHAT WAS RIGHT, AND SURVIVES. Three sentences, and the redraft is worse
    paper if it loses any of them: this is not a guaranty of repayment; it is
    not a guaranty of any other covenant; and no Guarantor is liable for a
    decline in sales, the cessation or failure of the business, insolvency, or
    any bankruptcy filing. That is the funder's published commitment #3, it is
    unusual — all three MCA forms filed as SEC exhibits in 2024-2026 guarantee
    "all representations, warranties and covenants" — and it is the reason this
    cluster exists to protect rather than to replace.

    WHAT WAS WRONG. Limb (b): liability for any representation or warranty of
    present fact that was "incorrect, false or misleading in any material
    respect when made". No knowledge qualifier, no proof requirement, no
    causation. Run it through §5.11, which warranted absolute title against
    unknown liens and statutory interests, and through §5.13, which warranted
    judicial conclusions about fraudulent transfer and preference, and a human
    being is personally liable for facts nobody can know. That is REVIEW-02's
    `frpa-5-11-and-5-13-route-personal-liability-through-the-narrowed-9-2`, and
    it is why those two clauses are in this cluster rather than in the
    representations one.

    Two more, smaller. The clause redefined Buyer as "{{funder}} (“Buyer”)" for
    the third time in the document — REVIEW-01's `frpa-buyer-named-by-three-widgets`
    — and it fell due "at the time of any breach", before any claim was proved.

    WHAT CHANGED. Own conduct, proved. Liability only for direct loss the
    Guarantor personally committed or knowingly directed, with Buyer bearing the
    burden on conduct, causation and amount. The express exclusions are kept and
    widened to name avoidance and clawback, which §9.4 used to reinstate.

    CROSS-REFERENCE 1, HANDED OVER BY THE BRIEF AND RESOLVED HERE. v4's limb (c)
    cited "Section 5.17 or Section 6.1.8". §6.1.8 no longer exists: the
    default-remedies cluster replaced fifteen limbs with three lettered ones, so
    the guaranty reached for a limb that had been deleted and was unenforceable
    in exactly the place it is meant to bite. Repointed at **Section 6.1(b)**,
    intentional diversion, which is what 6.1.8 was about.

    §5.17 KEEPS ITS NUMBER ON PURPOSE. The representations cluster deliberately
    kept a describable intentional-diversion covenant there because this clause
    reaches it that way, and `representations-are-present-fact.test.ts` asserts
    the citation from its side. Orphaning it would drop the limb of the guaranty
    the funder publishes as commitment #3 — "deliberately routing card volume
    away to avoid remitting".

    DEPARTURES FROM THE MEMO. Four.
    (1) The memo has two limbs, fraud and intentional diversion. This has three,
        splitting diversion into the §6.1(b) conduct and the §5.17 conduct, so
        that both cross-references land on a limb rather than on the clause as a
        whole. The memo predates both rewrites and cites neither.
    (2) "Buyer bears the burden of proving the specified conduct, causation, and
        loss" is written as "the conduct, causation and the amount of its loss",
        matching §6.2's phrasing. Two different formulations of the same
        standard in one document is how two clauses start disagreeing.
    (3) The memo's exclusion list gains "a slowdown in Card Receipts" against the
        defined term rather than the bare word, and "a bankruptcy filing by or
        against Merchant" rather than "bankruptcy", which is §6.1's phrasing.
    (4) "{{funder}} (“Buyer”)" is dropped rather than kept. Buyer is defined in
        the preamble; a third definition is the finding.

    NOT DONE, AND IT IS THE MEMO'S OWN GAP. The memo says Buyer shall enforce
    "only through lawful process or a written settlement" and says nothing about
    a confession of judgment. §6.2 as rewritten forbids one in terms. This
    clause does not repeat that, because a second, softer statement of a
    prohibition is how the first one gets narrowed.

    UNVERIFIED AUTHORITY. The memo rests this narrowing on [A1–A4], which the
    standing brief maps to Richmond Capital, 246 AD3d 585, Apollo Funding, 241
    AD3d 1508, NewCo, 250 AD3d 1641 and LG Funding. NOBODY ON THIS PROJECT HAS
    PULLED ANY OF THEM FROM THE OFFICIAL REPORTERS, and the memo's authority
    table is not in `lombard-contracts`, so the mapping from letter to case is
    itself unverified. The memo's own position is that this allocation is
    CONSERVATIVE — beyond what New York courts require — not that the wider
    guaranty is unlawful. No citation appears in the body.
  */
  {
    slug: 'frpa.guaranty-of-performance-9-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      IT IS THE LIMITED-CONDUCT GUARANTY, so that is its condition. Gating it
      also makes `guarantyScope` do something for the first time: the fact has
      existed with no reader, which meant a funder could answer `none` and still
      be handed a personal guaranty.

      `full-performance` is a REAL GAP and is deliberately left open. It is what
      the market actually does, and authoring it is a separate decision with the
      owner — not something to invent while narrowing the clause that competes
      with it.
    */
    includeWhen: (facts) => facts.guarantyScope === 'limited-conduct',
    number: '9.2',
    section: 'guaranty',
    sortKey: 20,
    heading: 'Guaranty of Performance',
    body: 'Each person signing this Agreement as a Guarantor is liable only for proven direct loss caused by (a) fraud in connection with this Agreement that the Guarantor personally committed or knowingly directed; (b) intentional diversion of Purchased Receipts that have actually arisen, of the kind described in Section 6.1(b), that the Guarantor personally committed or knowingly directed in order to prevent their delivery to Buyer; or (c) conduct of the kind described in Section 5.17 that the Guarantor personally committed or knowingly directed (the “Guaranteed Obligations”). An inaccurate representation alone does not establish fraud. Buyer bears the burden of proving the conduct, causation and the amount of its loss.\nThis is not a guaranty of the Purchased Amount, of future receipts, of Merchant’s business performance, or of any other covenant in this Agreement. Insufficient receipts, a slowdown in Card Receipts, a good-faith closure or failure of the business, Merchant’s insolvency, a bankruptcy filing by or against Merchant, an avoidance or clawback in a bankruptcy proceeding, a technical breach, or a default under another agreement does not itself create liability under this Guaranty. Liability is limited to proven direct loss caused by the conduct described above and to the costs Section 6.3 permits, and Buyer shall credit every recovery it makes for the same loss.\nNo other clause or incorporated document expands this Guaranty. Buyer shall give the Guarantor written notice describing the claim and the facts Buyer relies on, and shall enforce this Guaranty only through lawful process or a written settlement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'default-on-any-term-no-cure-no-materiality',
          'frpa-buyer-named-by-three-widgets',
          'guarantor-termination-notice-is-default',
          'guaranty-covers-every-covenant',
          'guaranty-reaches-business-failure',
        ],
      },
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-5-11-and-5-13-route-personal-liability-through-the-narrowed-9-2',
          'frpa-9-4-creates-guarantor-liability-on-merchant-bankruptcy',
          'frpa-undefined-capitalised-terms-in-the-unexamined-clauses',
        ],
      },
    ],
  },
  /*
    WHAT WAS WRONG. The last sentence, and it is the third route around §9.2:
    "In the event that Buyer must return any amount paid by Merchant or any
    other guarantor because that person has become subject to a proceeding under
    the United States Bankruptcy Code ... Guarantor's obligations under this
    Guaranty shall include that amount."

    Read that against §9.2, which says no Guarantor is liable for "any
    bankruptcy filing by or against Merchant", and against §6.1's overriding
    paragraph, which says a Title 11 filing gives rise to no "liability of any
    Guarantor". A merchant's bankruptcy is precisely when a trustee avoids
    preferential payments, so the clause reached the human on the one event the
    rest of the document promised it never would. REVIEW-02 raised it as
    `frpa-9-4-creates-guarantor-liability-on-merchant-bankruptcy`.

    THE REST WAS BROKEN TOO, IN THREE WAYS.
    (1) Automatic expansion. Buyer could "renew, extend, or otherwise modify"
        the Agreement "without releasing Guarantor", so a guarantor who signed
        for one purchase was bound to whatever the parties later agreed. Under a
        guaranty limited to the guarantor's OWN conduct that is incoherent: a
        person cannot commit fraud in a transaction they never saw.
    (2) Impairment waivers. Buyer could "sell, release, impair, waive, or
        otherwise fail to realize upon any collateral" and "foreclose ... in a
        manner that impairs or precludes Guarantor's right to obtain
        reimbursement" — a permanent waiver of the defences that exist because
        Buyer's own conduct affected the loss.
    (3) Permanent waiver of subrogation, reimbursement, performance,
        indemnification and contribution. The legitimate concern is a guarantor
        recovering from Merchant while Buyer is still unpaid; that is answered
        by postponement, not by abolition.

    WHAT CHANGED. Direct suit survives — Buyer need not sue Merchant first — and
    everything that expanded the guaranty without the guarantor's signature
    goes. Subrogation and its siblings are postponed while their exercise would
    duplicate a recovery or impair a valid unpaid claim, and are not waived. A
    payment returned or avoided in bankruptcy does not enlarge or reinstate the
    guaranty, which is the sentence this clause exists to reverse.

    DEPARTURES FROM THE MEMO. Three.
    (1) The memo's "Guarantor retains defenses concerning validity, scope,
        causation, amount, payment" is written "defences", matching §5.1 and
        §6.2. One spelling per document.
    (2) The memo's bankruptcy sentence is anchored to Section 6.1 as well as to
        Section 9.2. §6.1's overriding paragraph is the only sentence in the
        agreement that controls the whole agreement, and a guaranty waiver
        clause is exactly where a later editor would try to carve an exception
        out of it.
    (3) The memo leaves "Collateral" unexplained. §4.10 grants the security
        interest and is the `enrollment` cluster's; this clause points there
        rather than describing collateral in its own words.

    WHY THE GATE IS `limited-conduct` AND NOT `!== 'none'`. The owner's
    mid-flight instruction suggested the wider gate for §§9.4, 9.5 and 9.6, on
    the reasoning that they support whatever guaranty exists, and asked each to
    be checked against what was actually drafted. Checked, all three fail it:
    this clause says bankruptcy events "create no liability without
    independently proven conduct covered by Section 9.2", §9.5 determines each
    guarantor's liability "separately under Section 9.2", and §9.6 tells the
    signer that "Section 9.2 creates limited personal or entity liability". Each
    is FALSE under a full-performance guaranty, and each cites a clause that
    would not be in the document. Selecting them for `full-performance` would
    assemble a Section 9 whose waivers point at a guaranty that is not there.

    That leaves `full-performance` with no Section 9 clause but §9.1's identity
    grid, which is a real and reported gap — not one this cluster may close, and
    not one it may paper over by writing a guaranty it was told not to write.
  */
  {
    slug: 'frpa.guarantor-waivers-9-4',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /* Every sentence here is about the Section 9.2 guaranty. See the note above. */
    includeWhen: (facts) => facts.guarantyScope === 'limited-conduct',
    number: '9.4',
    section: 'guaranty',
    sortKey: 40,
    heading: 'Guarantor Waivers',
    body: 'Subject to Section 9.2, Buyer need not first obtain judgment against Merchant, or realize upon the Collateral described in Section 4.10, before bringing a valid claim against a Guarantor. No renewal, additional purchase, material amendment, substituted obligation or increase in the Purchased Amount binds a Guarantor without that Guarantor’s separate written consent identifying the resulting obligation.\nA notice of termination or non-renewal given by a Guarantor does not itself create a default or any liability. It prevents this Guaranty from extending to any later transaction, and does not release the Guarantor from liability for conduct in this transaction that Section 9.2 independently covers. No future transaction is covered without a fresh signed consent.\nEach Guarantor retains its defences as to validity, scope, causation, amount and payment, and all rights that may not be waived. Subrogation, reimbursement and contribution are postponed only while their exercise would cause a duplicate recovery or would materially impair recovery of a valid unpaid Guaranteed Obligation; they are not waived. A payment returned or avoided in a bankruptcy proceeding does not enlarge or reinstate this Guaranty. Consistently with Section 6.1, a bankruptcy filing, an insolvency and an avoidance create no liability for a Guarantor without independently proven conduct covered by Section 9.2. Enforcement remains subject to any applicable stay and to applicable law.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'debt-vocabulary-the-language-guard-would-not-catch',
          'frpa-9-4-creates-guarantor-liability-on-merchant-bankruptcy',
        ],
      },
    ],
  },
  /*
    WHAT WAS WRONG. One sentence, and it is wrong twice.

    First, it cannot do what it says. "The obligations of the persons or
    entities constituting Guarantors ... are joint and several" purports to bind
    everyone in a class the form never collects: §9.1 has ONE identity grid,
    «35»-«40», so a second guarantor has nowhere to sign. That is REVIEW-02's
    `frpa-9-5-refers-to-guarantors-the-form-cannot-collect`, and it is carried
    on §9.1 as well as here.

    Second, it is incoherent with the guaranty above it. §9.2 as rewritten makes
    a person liable only for conduct that person "personally committed or
    knowingly directed". Joint and several liability makes one guarantor pay for
    another's act. A document cannot say both.

    WHAT CHANGED. Liability is determined separately, and joint liability
    survives only where it means something under an own-conduct guaranty: two
    guarantors whose separate covered conduct caused the SAME loss, which Buyer
    may recover once.

    NO DEPARTURE FROM THE MEMO. Its replacement is adopted almost word for word;
    "signed Guaranty" is written "signed guaranty" only where it refers to the
    instrument each person signed rather than to this Section.

    NOT FIXED HERE, AND IT IS THE OTHER HALF OF THE FINDING. The form still
    collects one guarantor. This clause now describes what happens when there
    are several, and §9.1's grid still cannot record a second — a rendering and
    AcroForm change in `lombard-contracts`, not a clause change, and nobody's
    brief names §9.1.
  */
  {
    slug: 'frpa.joint-and-several-liability-9-5',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /* Own-conduct apportionment is meaningless without §9.2. See the note on §9.4. */
    includeWhen: (facts) => facts.guarantyScope === 'limited-conduct',
    number: '9.5',
    section: 'guaranty',
    sortKey: 50,
    heading: 'Joint and Several Liability',
    body: 'Each Guarantor’s liability is determined separately under Section 9.2. Two or more Guarantors are jointly and severally liable only for the same proven loss caused by conduct that Section 9.2 independently covers for each of them, and Buyer may recover that loss only once. No person is liable merely because another Guarantor signed this Agreement or committed a wrongful act.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['frpa-9-5-refers-to-guarantors-the-form-cannot-collect'] }],
  },
  /*
    WHAT WAS WRONG. Two things in a two-limb sentence.

    "Guarantor acknowledges the seriousness of the provisions of this Guaranty"
    acknowledges nothing a court can use; it is atmosphere. And "has had a full
    opportunity to consult with counsel of its choice or has decided not to
    avail himself or herself of that opportunity" is the same recital §7.10's
    jury waiver makes in capitals — "ONLY AFTER EXTENSIVE CONSIDERATION OF THE
    RAMIFICATIONS OF THIS WAIVER WITH THEIR ATTORNEYS" — which REVIEW-02 pairs
    with §7.22 as a recital of something that did not happen
    (`frpa-7-10-jury-waiver-recites-what-7-22-contemplates-is-false`). A form
    that recites facts about a signer it has never met is a form whose recitals
    are worth nothing when one of them is tested.

    WHAT CHANGED. It acknowledges the two things a signer can actually confirm:
    receipt of Section 9 and of the Agreement, and a real opportunity to ask
    questions and take advice. It says in terms that declining advice is
    permitted, and that the acknowledgement expands no liability and waives
    nothing — because an acknowledgement clause is a favourite place to put an
    estoppel.

    DEPARTURE FROM THE MEMO. It says "Sections 9.1 through 9.6". Written as "the
    whole of Section 9". Two reasons: §9.3 is a reserved line rather than a
    clause, so the range names something that is not there; and numbering is
    emitted at assembly under ADR 0011, so a clause that hardcodes a range of
    numbers is a clause that is wrong the first time a section is not selected.
    "Section 9.2" is kept as an explicit number because the whole point of the
    sentence is to tell the signer which clause creates the liability.
  */
  {
    slug: 'frpa.guarantor-acknowledgement-9-6',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /* It describes Section 9.2 by name and by content. See the note on §9.4. */
    includeWhen: (facts) => facts.guarantyScope === 'limited-conduct',
    number: '9.6',
    section: 'guaranty',
    sortKey: 60,
    heading: 'Guarantor Acknowledgement',
    body: 'Each Guarantor acknowledges receiving the whole of Section 9 and the complete Agreement, understanding that Section 9.2 creates limited personal or entity liability for specified conduct, and having a reasonable opportunity to ask questions and to consult independent counsel. A Guarantor may choose not to consult counsel. This acknowledgement does not expand liability and does not waive a defence or a statutory right.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-4-8-conditions-the-counsel-review-7-22-promises',
          'frpa-7-10-jury-waiver-recites-what-7-22-contemplates-is-false',
        ],
      },
    ],
  },
  /*
    THE MOST DANGEROUS SENTENCE IN SECTION 10, AND IT IS THE SECOND ONE.

    WHAT WAS WRONG. "Merchant hereby irrevocably and unconditionally waives
    personal service of any summons, complaint, or other process ... **Merchant
    further agrees to waive any objection to the absence of formal service of
    process.**"

    The first sentence is survivable on its own; parties consent to alternative
    service in commercial contracts and courts often give effect to it. The
    second is different in kind. A waiver of personal service says how process
    may be delivered. A waiver of the OBJECTION to the absence of formal service
    says the merchant may not complain that it was never delivered at all — it
    removes the remedy for getting the first sentence wrong. Read with the old
    §7.12, which completed service when a letter came back undeliverable, and
    §10.6, which made Section 10 supersede every notice provision, the three
    sentences are a procedure for obtaining a judgment against somebody who
    never learned of the case. REVIEW-01 carries both
    `service-without-notice-vs-commitment-9` and `ct-prejudgment-remedy-waiver`
    here for that reason.

    WHAT REVIEW-01 READ AND WHAT THE DOCUMENT NOW SAYS — CHECKED, NOT ASSUMED.
    REVIEW-01's evidence quotes a third sentence: *"Merchant understands and
    agrees that an action, lawsuit, or controversy may be taken up and considered
    by a court without any further notice."* It is not in the library body and it
    is not in `sources/Lombard_FRPA_v4.docx`. `REVIEW-01-manifest.json` records
    it deleted from both §10.1 and §10.2 — *"that was the wording the Connecticut
    statute is aimed at."* The fix landed; the finding stayed open on the rest.
    `a-default-judgment-needs-a-served-defendant.test.ts` now asserts that
    sentence never returns, with REVIEW-01's own quotation as the control.

    WHAT CHANGED, AND THIS IS THE CONSOLIDATION. Service must be made in a
    manner the procedural law of the court and any applicable court order
    authorise. The Section is stated to apply to each party INCLUDING each
    Guarantor, which is what §10.2 already claims for it and could not make true
    while this clause said "Merchant" — `guaranty.ts` recorded that risk in terms
    when it rewrote §10.2. Then the four things that must not be given up in
    advance, in one paragraph: valid service, a jurisdictional objection, a
    notice or hearing the law requires, and a prior court order required before a
    prejudgment remedy. That last is Conn. Gen. Stat. §36a-868 answered in its own
    vocabulary — VERIFIED, `mca/sources/CT-CGS-36a-861-872.txt`: *"No commercial
    financing contract ... shall contain any provision waiving a recipient's
    right to notice, judicial hearing or prior court order under chapter 903a ...
    in connection with the provider obtaining any prejudgment remedy."*

    THE MEMO'S SIXTH REFUTATION IS HONOURED HERE TOO. Nothing in this clause
    says that a consensual email-service arrangement is invalid or that it is a
    confession of judgment. The last sentence says the opposite of that: a party
    may accept or give up service AFTER a proceeding has begun, in the manner
    the law then permits. What this Agreement does not do is arrange it in
    advance, before there is a case to be served in.

    DEPARTURE 1 — THE SECTION SAYS WHAT IT APPLIES TO, IN ITS FIRST PARAGRAPH.
    The memo's replacement names "Merchant, Buyer, or a Guarantor" once, in the
    service sentence. Written as a separate sentence about the Section's reach,
    because §10.2, §10.3, §10.4, §10.5, §10.6, §7.5 and §7.12 all now point here
    and each of them needs this Section to cover the person it is talking about.

    DEPARTURE 2 — NO CITATION TO SECTION 9. The Guarantor is named as a party
    rather than by reference to the Guaranty, because §§9.2-9.6 are gated on
    `guarantyScope` and six clauses already dangle at Section 9 in a no-guaranty
    template. §10.1 is ungated and must not become the seventh.

    DEPARTURE 3 — "OPERATIONAL NOTICE" IS TIED TO §7.3 BY NUMBER. The memo says
    "Operational notice methods do not establish service of process" without
    saying which methods. §7.3 is the clause that supplies them, it is ungated,
    and it already sends judicial process here.
  */
  {
    slug: 'frpa.section-10-1',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '10.1',
    section: 'service',
    sortKey: 10,
    heading: '',
    body: 'A summons, a complaint or other judicial process must be served on Merchant, on Buyer, or on a Guarantor in a manner that the procedural law of the court, and any applicable order of that court, authorizes. This Section applies to each party to this Agreement, including each Guarantor, and it is the only provision of this Agreement that governs how judicial process is served.\nThis Agreement contains no waiver by any party of valid service, of an available jurisdictional objection, of a notice or a hearing that applicable law requires, or of a prior court order that applicable law requires before a prejudgment remedy is obtained. It contains no confession of judgment, and it gives no person authority to obtain a judgment otherwise than by lawful process.\nA method of giving an operational notice under Section 7.3 is not service of process, and using one is not evidence that service has been made. A party may accept service, or give up service, after a proceeding has begun, in the manner the law then applicable permits; nothing in this Agreement does so in advance.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['ct-prejudgment-remedy-waiver', 'service-without-notice-vs-commitment-9'] },
    ],
  },
  /*
    WHAT WAS WRONG. Nothing in the words; everything in there being two of them.
    §10.1 waives personal service for Merchant and §10.2 waived it again for
    Guarantor, in a second sentence that can be edited without the first. Two
    rules over one subject drift, and this document has already shown how — §2.4
    and §5.17 disagreed about adding a bank account for exactly this reason.

    WHAT CHANGED. It becomes a pointer. §10.1 is stated to apply to each party
    including each Guarantor, and this Section adds nothing of its own.

    DEPARTURE FROM THE MEMO, AND IT IS THE LARGEST IN THIS CLUSTER. The memo's
    disposition is DELETE, replacement text "[Reserved]". Neither is available:
    ADR 0012 closed `[Reserved]` — an assembled document has no reserved
    sections — and removing the record edits `library.test.ts` (200 clauses) and
    `frpa-coverage.test.ts` (97), which this cluster may not do. What is
    available is to stop it being a SECOND RULE, which is the whole of the
    memo's rationale ("§10.1 applies to every party and guarantor"). Recorded
    for the brief-writer: deleting the record is the better fix and needs the
    two counts moved in the same change.

    AND THE MEMO'S PREMISE IS NOT TRUE YET. §10.1 as it stands says "Merchant",
    not "each party". It is the `disputes-service` cluster's, and until that
    cluster widens it, this Section is what makes it reach a Guarantor at all.
    If that rewrite lands and narrows §10.1 to Merchant, this clause points at a
    waiver that does not cover the person it names.

    NOT ARGUED HERE, AND WORTH ARGUING. A blanket waiver of personal service by
    a natural-person guarantor is materially more aggressive than the same
    waiver by a merchant entity, and REVIEW-01's `ct-prejudgment-remedy-waiver`
    is carried on both. Whether Lombard should ask a human for it at all is a
    question for the cluster that owns §10.1.
  */
  {
    slug: 'frpa.section-10-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      Wherever a guaranty exists, whatever its scope — unlike §§9.2-9.6, nothing
      in this sentence depends on the guaranty being the limited one.
    */
    includeWhen: (facts) => facts.guarantyScope !== 'none',
    number: '10.2',
    section: 'service',
    sortKey: 20,
    heading: '',
    body: 'Service of process on a Guarantor is governed by Section 10.1, which applies to each party to this Agreement, including each Guarantor. This Section states no separate waiver and imposes no obligation on a Guarantor that Section 10.1 does not impose on every party.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['ct-prejudgment-remedy-waiver'] }],
  },
  /*
    THE FREESTANDING ADVANCE CONSENT, AND THE TWO WIDGETS THAT MUST OUTLIVE IT.

    WHAT WAS WRONG. "MERCHANT HEREBY AGREES TO ACCEPT SERVICE OF ANY SUMMONS,
    COMPLAINT, OR OTHER PROCESS BY ELECTRONIC MAIL AT «48» OR BY UNITED STATES
    POSTAL SERVICE AT «49» OR BY ANY OTHER MEANS PERMITTED BY NEW YORK OR FLORIDA
    LAW." An agreement, given at signature, to accept service by two channels the
    merchant may not be reading in two years' time — and a second place, after
    Section 1, where the merchant's addresses are collected. A form that collects
    one party's address twice will eventually hold two different addresses, and
    service is the one subject where that costs a default judgment. §10.4's
    rewrite made exactly this argument about §9.1 and the Guarantor.

    WHAT CHANGED — THE §10.4 SHAPE, DELIBERATELY. The advance consent goes and
    the blanks survive as an OPTIONAL designation of a different address, which
    is what §10.4 now does for the Guarantor. The two clauses become symmetrical
    instead of being one designation and one consent, and the Section says in
    terms what a designated address is: a place a document may be sent, not an
    agreement about what counts as service.

    THE MEMO SAYS "[Reserved]" AND THE LIBRARY CANNOT. ADR 0012 closed
    `[Reserved]` — `select-clauses.ts` says an assembled document has no reserved
    sections — and deleting the record moves `library.test.ts`'s 203 and
    `frpa-coverage`'s 100. §10.2's note recorded that deletion is the better fix
    and needs the counts moved in the same change. It is the better fix for
    §10.2. It is NOT available here, and the reason is «48» and «49»: they are
    AcroForm anchors the Lombard pipeline injects into the rendered FRPA, and a
    body that stops claiming them is a body the injector fills into nothing. If
    this record is ever removed, «48» and «49» must come out of the field map in
    the same change — the identical warning §10.4 carries for «50» and «51».
    VERIFIED against `sources/Lombard_FRPA_v4.docx`: §10.3 carries «48» and «49»
    in two FORMTEXT fields, and §10.4 carries «50» and «51».

    DEPARTURE FROM THE MEMO — MERCHANT'S ADDRESSES ARE SENT TO SECTION 1, NOT TO
    §7.3. The memo routes contact data to "§9.1 and ordinary notices". §9.1 is
    the Guarantor's grid and is gated on `guarantyScope`; Merchant's addresses
    are in Section 1, which every template has and which the dangling-reference
    check excludes because the Lombard pipeline injects it.

    THE CAPITALS ARE GONE, for the reason §10.4 gives: capitals are for a
    disclosure a regulator requires to be conspicuous, and 7 TAC §86.310(d)'s
    OCCC notice is the one that needs them.
  */
  {
    slug: 'frpa.section-10-3',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '10.3',
    section: 'service',
    sortKey: 30,
    heading: '',
    body: 'The email address and the mailing address Merchant gives in Section 1 are Merchant’s addresses for notice under Section 7.3. Merchant may designate a different email address at _____________«48»_____________ or a different mailing address at ____________________________«49»____________________________, and a designated address governs from the date it is given.\nA designated address is a place at which a document may be sent to Merchant. It is not an agreement about what counts as service of process, it does not make a communication sent to it into service of process, and it gives up no right to be served by a means applicable law permits. Section 10.1 governs judicial process.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    WHAT WAS WRONG. The same duplication as §10.2, plus a third collection of
    the same data. §9.1 already takes the Guarantor's Home Address («38») and
    Email («40»); this took an email and a postal address again, in capitals,
    and made accepting service by them an agreement rather than a designation.
    A form that collects one person's address twice will eventually hold two
    different addresses, and service is the one place that costs a default
    judgment.

    WHAT CHANGED. §9.1's addresses are the Guarantor's addresses. The two blanks
    survive as an OPTIONAL designation of a different address, and the Section
    waives no right to be served by another lawful means.

    THE WIDGETS ARE KEPT, «50» AND «51», in the positions the current body has
    them. README rule 2 as ADR 0012 restates it: the body is the clause's words
    and the `«N»` markers are kept, because they are the AcroForm anchors the
    Lombard pipeline injects and a tidied body is a body the pipeline cannot
    fill.

    DEPARTURE FROM THE MEMO. Same as §10.2 — the disposition is DELETE and the
    library cannot delete. The memo's own reasoning is followed instead:
    "separate Guarantor contact data belongs in §9.1 and ordinary notices", so
    the clause now says exactly that. If the record is ever removed, «50» and
    «51» must be removed from the AcroForm map in the same change or the
    pipeline injects two widgets no clause claims.

    THE CAPITALS ARE GONE, AND THAT IS DELIBERATE. Capitalising a whole
    paragraph is the conspicuousness convention some statutes require for a
    specific disclosure; using it for a service-address blank teaches a reader
    that capitals mean nothing in this document, which is a cost paid later by
    the one disclosure that needs them — 7 TAC §86.310(d)'s OCCC notice.
  */
  {
    slug: 'frpa.section-10-4',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /* With §10.2: any guaranty, not only the limited one. */
    includeWhen: (facts) => facts.guarantyScope !== 'none',
    number: '10.4',
    section: 'service',
    sortKey: 40,
    heading: '',
    body: 'The email address and the mailing address a Guarantor gives in Section 9.1 are that Guarantor’s addresses for notice and for service of process under Section 10.1. A Guarantor may designate a different email address at _____________«50»_____________ or a different mailing address at ____________________________«51»____________________________, and a designated address governs from the date it is given. This Section collects no obligation of its own and waives no right to be served by any other means applicable law permits.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    THE QUIET HALF OF THE SAME MACHINE.

    WHAT WAS WRONG. The duty is fine. "Unless Buyer is notified of a change in
    address, all addresses shall be **presumed to be accurate**" is not. Read
    with the old §7.12 — service complete on a returned envelope, service to the
    last known address sufficient — the presumption is the sentence that makes a
    letter to an address the merchant left two years ago into good service, and
    puts the merchant to rebutting its own contract afterwards. It is one of the
    four sentences that, together, do what a confession of judgment does.

    WHAT CHANGED. The duty stays and is made reciprocal — Buyer's servicing
    addresses go stale too, and §7.3 already obliges Buyer to maintain a working
    servicing email address and to say when it changes. The presumption goes, and
    the consequence of a stale address is stated exactly: failing to update one
    does not by itself establish valid service and does not give up a procedural
    protection.

    DEPARTURE FROM THE MEMO — THE CROSS-REFERENCES ARE ONE, NOT TWO. The memo
    writes "shall promptly update its operational notice contacts under Sections
    7.3 and 9.1". §9.1 is the Guarantor identity grid and is gated on
    `guarantyScope !== 'none'`, so an ungated §10.5 citing it would dangle in a
    no-guaranty template — a fifth entry in `select-clauses.test.ts`'s Section 9
    register, added by the cluster that is meant to be closing that file out.
    Written as §7.3 alone, with the Guarantor named as a person who owes the same
    duty rather than by a reference to the Section that collects its details.
    This is §7.6's device — describe by subject where the number is gated — and
    the sixth time this rewrite has needed it.
  */
  {
    slug: 'frpa.section-10-5',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '10.5',
    section: 'service',
    sortKey: 50,
    heading: '',
    body: 'Merchant, Buyer and each Guarantor shall keep current the addresses each gives in this Agreement, and shall give a change of address under Section 7.3.\nA failure to keep an address current does not by itself establish valid service of judicial process, does not give up a procedural protection, and does not make a communication sent to a former address into service. Section 10.1 governs judicial process.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    ELEVEN WORDS THAT SUBORDINATED EVERY NOTICE PROVISION IN THE AGREEMENT.

    WHAT WAS WRONG. "This Section shall **supersede any notice requirements in
    this Agreement** with respect to service of process." Read alone it is
    housekeeping. Read with the Section it sat at the end of, it is the sentence
    that made the rest of Section 10 win: §7.3's channels, §6.1's cure notice,
    §3.2's reconciliation timetable — anything a party might argue was a notice
    requirement bearing on process gave way to a Section that completed service
    on an undeliverable envelope. REVIEW-01 quotes it in both of the findings it
    carries on §10.1 and §7.12, in each case as the third element.

    WHAT CHANGED. It stops subordinating and starts distinguishing, which is the
    memo's disposition. Two subjects, one Section each, neither displacing the
    other and neither displacing mandatory procedural law or a court order. A
    third sentence decides the hard case by subject rather than by hierarchy: a
    step in a proceeding is judicial process, and everything else is a notice.

    DEPARTURE FROM THE MEMO — THE TIE-BREAK SENTENCE IS ADDED. The memo's
    replacement states the two rules and stops. A clause whose whole job is to
    tell a reader which of two Sections applies should answer the case where it
    is not obvious, or the reader is back where v4 left them.

    THE WORD "SUPERSEDE" DOES NOT APPEAR. Deliberately, and asserted: a Section
    that supersedes is the shape this clause is being rewritten out of, and the
    word is where a later editor would start putting it back.
  */
  {
    slug: 'frpa.section-10-6',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '10.6',
    section: 'service',
    sortKey: 60,
    heading: '',
    body: 'Section 10.1 governs the service of a summons, a complaint and other judicial process, and it is the only provision of this Agreement that does. Section 7.3 governs a notice, a request, a consent and any other communication between the parties about the administration of this Agreement.\nNeither Section displaces a mandatory rule of procedural law or an order of a court, and neither of them overrides the other.\nWhere it is unclear which of the two applies to a communication, the subject decides: a step in a proceeding is judicial process, and anything else is a notice.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
];
