import type { Clause } from '../types';
import { FL_BOILERPLATE } from './boilerplate';
import { FL_LEASE_BODY } from './lease-body';
import { FL_MAINTENANCE } from './maintenance';
import { FL_STATUTORY_DISCLOSURES } from './statutory-disclosures';
import { FL_USE_AND_REMEDIES } from './use-and-remedies';

/**
 * The Florida clause library.
 *
 * Order within the array is irrelevant — `selectClauses` orders by the
 * `section` sequence below and then by `sortKey`, so adding a clause never
 * requires renumbering anything.
 */
/**
 * Every clause module. Listed here rather than spread inline so that
 * `library-invariants.test.ts` can assert the library actually contains all of
 * them — a module that is imported but never spread compiles cleanly, is not
 * flagged as unused, and silently drops its clauses out of every lease.
 */
export const FL_CLAUSE_MODULES = {
  leaseBody: FL_LEASE_BODY,
  maintenance: FL_MAINTENANCE,
  useAndRemedies: FL_USE_AND_REMEDIES,
  boilerplate: FL_BOILERPLATE,
  statutoryDisclosures: FL_STATUTORY_DISCLOSURES,
} as const;

export const FL_LIBRARY: Clause[] = Object.values(FL_CLAUSE_MODULES).flat();

/**
 * Document order of sections. A clause naming a section not on this list is a
 * library error and `selectClauses` throws rather than silently appending it
 * somewhere arbitrary.
 */
export const FL_SECTION_ORDER = [
  'parties',
  'premises',
  'term',
  'rent',
  'deposit',
  'use',
  'utilities',
  'maintenance',
  'access',
  'default',
  'termination',
  'pets',
  'rules',
  'notices',
  'general',
  'disclosures',
] as const;

/**
 * What each section is called when it is PRINTED.
 *
 * These sixteen have always been modelled and never shown. `numberClauses`
 * derives decimal numbers from them — `4.2`, `4.3` — but the document jumped
 * from `4.2 LATE PAYMENT` to `4.3 RETURNED PAYMENTS` with no `4. RENT AND
 * CHARGES` anywhere in it. Decimal numbering asserts a parent, and a reader who
 * cannot see the parent is being shown half a scheme.
 */
export const FL_SECTION_NAMES: Record<(typeof FL_SECTION_ORDER)[number], string> = {
  parties: 'Parties',
  premises: 'Premises',
  term: 'Term',
  rent: 'Rent and Charges',
  deposit: 'Deposit and Money Held',
  use: 'Use of the Premises',
  utilities: 'Utilities and Insurance',
  maintenance: 'Maintenance and Repair',
  access: 'Access and Inspection',
  default: 'Default and Remedies',
  termination: 'Ending the Lease',
  pets: 'Pets',
  rules: 'Rules and Association',
  notices: 'Notices',
  general: 'General',
  disclosures: 'Statutory Disclosures',
};
