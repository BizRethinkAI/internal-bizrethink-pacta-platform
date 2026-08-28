import type { Clause } from '../types';
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
export const FL_LIBRARY: Clause[] = [
  ...FL_LEASE_BODY,
  ...FL_MAINTENANCE,
  ...FL_USE_AND_REMEDIES,
  ...FL_STATUTORY_DISCLOSURES,
];

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
  'disclosures',
] as const;
