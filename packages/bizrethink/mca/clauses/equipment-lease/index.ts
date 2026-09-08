import type { McaClause } from '../types';
import { EQUIPMENT_LEASE_AGREEMENT } from './agreement';
import { EQUIPMENT_LEASE_GUARANTY } from './guaranty';

/**
 * The Equipment Lease Agreement — twenty-six clauses, with Lombard Pay LLC.
 *
 * READ `twins.ts` BEFORE CHANGING ANYTHING HERE. This document has a twin, the
 * Subscription Agreement, numbered identically clause for clause. A fix applied
 * here and not there is the divergence REVIEW-02 named, and
 * `__tests__/twins.test.ts` is what refuses it.
 *
 * WHO EXAMINED IT, AND THE GAP THAT LEAVES. **REVIEW-02**, end to end, raising
 * twelve findings. REVIEW-01 never read this document — its twenty-one findings
 * on this material are all against the *Subscription*, which is the corpus
 * confusion Phase 0 recorded backwards: its table credits the Equipment Lease
 * with thirteen examined clauses, and the register shows every one of those
 * findings carrying a `sub-` prefix and a Subscription document.
 *
 * So the twin traffic has only ever run one way. REVIEW-02 checked ten of its
 * twelve findings against the Subscription and said so; nobody has checked
 * REVIEW-01's twenty-one the other way. Those are recorded on the Subscription
 * clauses where they were raised and are NOT copied here, because copying them
 * would assert an examination that did not happen. See the in-flight note.
 *
 * §4.1 GUARANTOR INFORMATION HAS AN EMPTY BODY, AND THAT IS THE DOCUMENT.
 * It is a form block of AcroForm widgets under a heading, with no prose at all.
 * It is kept rather than dropped because the twin check counts clauses, and a
 * numbered section present in both documents that this library silently omitted
 * would make the two look like they agreed about something they had never been
 * asked about.
 */
export const EQUIPMENT_LEASE_CLAUSE_MODULES = {
  agreement: EQUIPMENT_LEASE_AGREEMENT,
  guaranty: EQUIPMENT_LEASE_GUARANTY,
} as const;

export const EQUIPMENT_LEASE_LIBRARY: McaClause[] = Object.values(EQUIPMENT_LEASE_CLAUSE_MODULES).flat();

export const EQUIPMENT_SECTION_ORDER = ['agreement', 'guaranty'] as const;
