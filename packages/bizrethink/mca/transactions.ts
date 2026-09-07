/**
 * Which KIND of financing a disclosure is prescribed for.
 *
 * A SECOND AXIS, NOT A WIDENING OF THE FIRST. `McaJurisdiction` says which
 * state's law a form is a creature of. This says which transaction that state
 * prescribes it for, and the two are independent: California prescribes a
 * different table for sales-based financing (§914), for lease financing (§915),
 * for factoring (§912/913), for closed-end (§910), for open-end (§911) and for
 * asset-based lending (§916), all in one regulation.
 *
 * WHY IT HAD TO EXIST BEFORE THE LEASE FORMS COULD BE ADDED. Until now every
 * spec in the library was a sales-based financing disclosure, so
 * `disclosuresFor('US-CA')` returned exactly one thing and the question never
 * arose. It returns three now, and two of them describe transactions the third
 * is not. Handing §915's table to a sales-based deal is the same class of
 * defect as handing New York's sentence to a California form — the right shape,
 * the wrong instrument — and `mca/provenance/source-text.ts` already documents
 * the source-level version of it: New York's own file contains California's
 * phrasing of the funding-provided sentence in §600.11 and §600.12, sections
 * governing transaction types that are not ours.
 *
 * NOTE WHAT THIS IS NOT. It is not a tenant axis and not a product axis.
 * "Lombard-specific" belongs on neither this type nor `McaJurisdiction`; a
 * per-tenant distinction belongs on the document that uses these specs. The
 * test in `__tests__/jurisdiction.test.ts` pins that, and the values below are
 * every one of them a category the regulation itself names.
 */
export type McaTransactionType =
  /** 10 CCR §914, 23 NYCRR §600.6 — the merchant cash advance proper. */
  | 'sales-based-financing'
  /** 10 CCR §915, 23 NYCRR §600.14 — a lease that creates a security interest. */
  | 'lease-financing'
  /**
   * 10 CCR §956, 23 NYCRR §600.17 — the Itemization of Amount Financed, which
   * accompanies whichever disclosure was given. §956(a) applies "when a
   * provider provides a disclosure … under sections 910 through 917", so it is
   * a companion to all six tables rather than an instrument of its own, and
   * `prescribedFormsForTransaction` returns it for every transaction type.
   */
  | 'any-commercial-financing'
  /**
   * A state whose statute we hold no primary text for.
   *
   * CURRENTLY UNUSED, AND KEPT ON PURPOSE. It existed for Connecticut and
   * Virginia, where the package held each state's FORM and not its Act, and
   * asserting a transaction scope would have meant reading it out of the
   * Department of Banking's characterisation. Both statutes were vendored on
   * 2026-09-07 — Conn. Gen. Stat. §36a-861(1) and Va. Code §6.2-2228 — so both
   * forms now declare `sales-based-financing` on the Act's own words.
   *
   * Deleting it would leave the next person adding a twelfth state with no
   * honest option but to guess, which is the failure this whole package is
   * built around. It stays as the value to reach for, and a spec carrying it is
   * a spec whose scope somebody still has to read.
   */
  | 'unread-statutory-scope';

export const MCA_TRANSACTION_TYPES: readonly McaTransactionType[] = [
  'sales-based-financing',
  'lease-financing',
  'any-commercial-financing',
  'unread-statutory-scope',
];
