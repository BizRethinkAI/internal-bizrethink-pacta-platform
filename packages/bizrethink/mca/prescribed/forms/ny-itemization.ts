import type { ItemizationForm } from '../itemization';

/**
 * New York's Itemization of Amount Financed, 23 NYCRR §600.17.
 *
 * THE ONE PLACE IN THIS LIBRARY WHERE THE TWO STATES REALLY DO AGREE, and
 * saying so is a finding rather than a shrug. §600.17(a)(1)–(6) and 10 CCR
 * §956(a)(1)–(6) prescribe the same six descriptions in the same order and the
 * same words; §600.17(c) and §956(c) impose the same four conditions. The two
 * shipped Lombard itemizations are byte-identical apart from the citation
 * printed under the title, and — unusually — that is correct.
 *
 * IT IS STILL TWO SPECS. Merging them would be the move `near-identical-states`
 * exists to refuse, and the case against it is not aesthetic:
 *
 *   - the checks run against DIFFERENT vendored files with different digests,
 *     so a New York amendment must be able to break New York alone;
 *   - `disclosuresFor` is the only route to a spec and it filters on
 *     jurisdiction, so a shared object would be reachable from both states by
 *     construction — the exact property the filter exists to deny;
 *   - the agreement is a fact about the regulations TODAY. Two of the four
 *     other CA/NY pairs in this package diverge by one word, and one of those
 *     divergences shipped to production.
 *
 * The differences that do exist are typographic and are recorded so a later
 * reader does not mistake them for substance: §600.17(a)(1) ends the first
 * description with a semicolon where §956(a)(1) uses a full stop, and
 * §600.17(a)(5) writes the alternative as "prepaid Finance Charges" with a
 * lower-case p. Neither changes a word of what the line must say.
 *
 * §600.17(c)(3) — "need not be signed by the recipient" — sits alongside
 * §600.18(a), which requires the provider to obtain a signature "on all
 * disclosures required to be presented to the recipient pursuant to the CFDL".
 * The specific provision governs and our form carries no signer. Recorded
 * because the tension is real and a reader who finds §600.18 first will think
 * the form is defective.
 */
export const NY_ITEMIZATION: ItemizationForm = {
  slug: 'ny-itemization',
  citation: '23 NYCRR §600.17',
  sourceFile: 'NY-23NYCRR-600.txt',
  jurisdiction: 'US-NY',
  transaction: 'any-commercial-financing',
  status: 'published',
  source: {
    kind: 'regulator-prescribed-form',
    citation: '23 NYCRR §600.17',
    sourceFile: 'NY-23NYCRR-600.txt',
    verbatimVerifiedAt: '2026-09-07',
    structureVerifiedAt: '2026-09-07',
  },
  sourceDigest: 'f255a3f65ef0a79fc3583844a314a4ff9ffa97c8cc42839e641cd7d93b9df07a',
  section: {
    from: 'Section 600.17 Funding recipient will receive.',
    to: 'Section 600.18 Signatures.',
  },
  // §600.17(a)(1)–(6) enumerate in order and §600.17(b) prints the examples in
  // the same order, so the order is machine-re-checkable — as for §956, and
  // unlike the §600.6 table.
  structureEvidence: 'source-order',
  lines: [
    {
      id: 'given-directly',
      description: 'Amount Given Directly to You',
      citation: '23 NYCRR §600.17(a)(1)',
      reference: null,
    },
    {
      id: 'on-account',
      description: 'Amount Paid on your Account with Us',
      citation: '23 NYCRR §600.17(a)(2)',
      reference: null,
    },
    {
      id: 'to-others',
      // §600.17(a)(3), as §956(a)(3): each payee on a separate line, the payee
      // identified, no wording prescribed. Ours, and counted as unchecked.
      description: null,
      citation: '23 NYCRR §600.17(a)(3)',
      reference: null,
    },
    {
      id: 'provided-total',
      description: 'Amount Provided to You or on Your Behalf',
      citation: '23 NYCRR §600.17(a)(4)',
      reference: { kind: 'sum-of-preceding' },
    },
    {
      id: 'prepaid',
      description: 'Prepaid Finance Charges',
      citation: '23 NYCRR §600.17(a)(5)',
      reference: null,
    },
    {
      id: 'amount-financed',
      // §600.17(a)(6) reproduces California's backwards "(e.g. 'Item 5 minus
      // Item 4.')" verbatim, including the slip, while its own examples at
      // §600.17(b) print "(4 minus 5)" and "(5 minus 6)". Encoded as the
      // arithmetic is; see `ca-itemization.ts`.
      description: 'Amount Financed',
      citation: '23 NYCRR §600.17(a)(6)',
      reference: { kind: 'difference', minuend: 'provided-total', subtrahend: 'prepaid' },
    },
  ],
};
