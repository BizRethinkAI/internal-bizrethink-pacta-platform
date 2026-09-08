import type { ItemizationForm } from '../itemization';

/**
 * California's Itemization of Amount Financed, 10 CCR §956.
 *
 * NOT A TABLE THE WAY §914 AND §915 ARE. §956(a) requires a document
 * "substantially similar in form to the example disclosure provided in
 * subdivision (b) below, including at a minimum" six described items. There is
 * no row count, no "shall include only", and no prescribed sentence anywhere —
 * every item is a DESCRIPTION the line must carry, not a sentence the row must
 * reproduce. `prescribed/itemization.ts` says at length why that needed its own
 * checker.
 *
 * WHEN IT IS REQUIRED. §956(a) conditions the whole document on "the amount
 * financed is greater than the recipient funds". On a plain Lombard deal —
 * origination fee withheld, no third-party payoff, no prior balance — that
 * condition is met by the withheld fee alone. The paired
 * `Lombard_CA_Disclosure_NoDeductions_v1` variant exists for the case where it
 * is not, and that variant travels with no itemization at all.
 *
 * THREE THINGS THAT LOOK LIKE OMISSIONS AND ARE NOT:
 *
 *   - No signer. §956(c)(3): the disclosure "need not be signed by the
 *     recipient". Our form says so on its face.
 *   - An assumptions paragraph below the items. §956(c)(4) expressly permits
 *     "a description of any assumptions the provider used to make the
 *     disclosure BELOW the information required by subdivision (a)" — below,
 *     which our form respects.
 *   - Only one payee line. §956(a)(3) requires each third-party payee on a
 *     separate line, so the count is a fact about the deal. The checker matches
 *     the prescribed descriptions as an ordered subsequence for that reason,
 *     and `cross-reference` is what stops a second payee line silently
 *     invalidating the two computed lines.
 *
 * WHAT THIS SPEC DOES NOT TOUCH. The amounts. `instance/identities.ts` holds
 * `itemization-internal` and `itemization-agreement`, and it also holds the
 * §956(a)(3)/§900(a)(1)(A) reading that decides where a fee the financer
 * RETAINS belongs — a $2,895 disagreement with
 * DISCLOSURE-COMPUTATION-SPEC.md's worked example, recorded there as a counsel
 * question and deliberately not resolved by either side picking.
 */
export const CA_ITEMIZATION: ItemizationForm = {
  slug: 'ca-itemization',
  citation: '10 CCR §956',
  sourceFile: 'CA-10CCR-900-956.txt',
  jurisdiction: 'US-CA',
  transaction: 'any-commercial-financing',
  status: 'published',
  source: {
    kind: 'regulator-prescribed-form',
    citation: '10 CCR §956',
    sourceFile: 'CA-10CCR-900-956.txt',
    verbatimVerifiedAt: '2026-09-07',
    structureVerifiedAt: '2026-09-07',
  },
  sourceDigest: 'e43c919418e4aeaa2a55cd421fe12a5d8e3c9a316d08345d25b4ba50abe54930',
  /*
    Scoped like every other spec in the library, and it earns it: "Amount
    Financed" is a §900 defined term used throughout the file, and "Prepaid
    Finance Charge" appears in §943 and in the §910–§917 tables. Checked against
    the whole file, a spec that had drifted from §956 would still find every
    description it looked for.

    §956 is the LAST section, so the end anchor is its own authority note rather
    than the next heading. `sectionOf` scans forward from the start anchor, so
    the sixteen earlier copies of that line are not reachable from here.
  */
  section: {
    from: '§ 956. Funding Recipient Will Receive',
    to: 'Note: Authority cited: Sections 321 and 22804, Financial Code. Reference: Sections 22800, 22802, 22803',
  },
  /*
    'source-order', and unlike §914 this one can afford it. §956(a)(1)–(6)
    enumerate the lines in the order they appear, and §956(b) then prints two
    worked examples in the same order — so the machine really re-checks the
    order on every run rather than resting on a human having read it once.
  */
  structureEvidence: 'source-order',
  lines: [
    {
      id: 'given-directly',
      // §956(a)(1): 'The recipient funds, described as "Amount Given Directly
      // to You."'
      description: 'Amount Given Directly to You',
      citation: '10 CCR §956(a)(1)',
      reference: null,
    },
    {
      id: 'on-account',
      // §956(a)(2), "followed by the account number, if applicable". Lombard
      // has no account number to print, so the line carries the description
      // alone — which is why the description here stops where it does.
      description: 'Amount Paid on your Account with Us',
      citation: '10 CCR §956(a)(2)',
      reference: null,
    },
    {
      id: 'to-others',
      /*
        §956(a)(3) requires "any amounts paid to other persons by the financer
        on the recipient's behalf, each listed on a separate line", and requires
        the disclosure to identify those persons — but prescribes NO wording for
        the line. So the words on our form are ours, this line is counted as
        undescribed by `itemizationCoverage`, and the checker deliberately does
        not treat a null description as a wildcard: doing so would let this line
        be consumed in place of a prescribed one and hide a real omission.
      */
      description: null,
      citation: '10 CCR §956(a)(3)',
      reference: null,
    },
    {
      id: 'provided-total',
      // §956(a)(4), "followed by a reference to how the amount was calculated
      // (e.g., 'Sum of Items 1-7.')". The reference names line POSITIONS, which
      // is what `cross-reference` re-checks against the document's own lines.
      description: 'Amount Provided to You or on Your Behalf',
      citation: '10 CCR §956(a)(4)',
      reference: { kind: 'sum-of-preceding' },
    },
    {
      id: 'prepaid',
      /*
        §956(a)(5) allows either 'Prepaid Finance Charge' or 'Prepaid Finance
        Charges', "as applicable", followed by a description of the purpose. Our
        form withholds one fee and uses the plural, which is the wider of the
        two and matches either; the singular would not match a plural line, so
        this is the choice that follows the document rather than constrains it.
      */
      description: 'Prepaid Finance Charges',
      citation: '10 CCR §956(a)(5)',
      reference: null,
    },
    {
      id: 'amount-financed',
      /*
        §956(a)(6), "followed by a reference to how the amount was calculated
        (e.g., 'Item 5 minus Item 4.')".

        THE REGULATION'S OWN EXAMPLE IS BACKWARDS and neither of its two worked
        examples agrees with it: §956(b)(1) prints "Amount Financed (4 minus 5)"
        and §956(b)(2) prints "(5 minus 6)" — in both, the sum comes first and
        the prepaid charge is subtracted from it. The order in the parenthetical
        at (a)(6) is a drafting slip. Encoded as the arithmetic actually is,
        because encoding it as the slip would put a wrong document through the
        checker green.
      */
      description: 'Amount Financed',
      citation: '10 CCR §956(a)(6)',
      reference: { kind: 'difference', minuend: 'provided-total', subtrahend: 'prepaid' },
    },
  ],
};
