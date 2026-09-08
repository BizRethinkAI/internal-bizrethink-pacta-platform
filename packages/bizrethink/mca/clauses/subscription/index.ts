import type { McaClause } from '../types';
import { SUBSCRIPTION_AGREEMENT } from './agreement';
import { SUBSCRIPTION_GUARANTY } from './guaranty';

/**
 * The Subscription Agreement — twenty-six clauses, with Lombard Pay LLC.
 *
 * THE DOCUMENT PHASE 0 LEFT OUT. `MCA-CLAUSE-LIBRARY-PHASE0.md` counts five
 * negotiated agreements; `CONTRACT_INDEX.md` publishes six. This is the sixth,
 * and REVIEW-02 found the omission mattered in a way the count does not convey:
 * it is the Equipment Lease with its vocabulary swapped, so the two are one
 * document in two live templates.
 *
 * IT IS ALSO THE DOCUMENT REVIEW-01 ACTUALLY READ. All twenty-one of that
 * review's findings on this material are against this file, not its twin — the
 * opposite of what Phase 0's table says. Recorded here where they were raised.
 *
 * REVIEW-02's findings appear on ten of these clauses as well, because that
 * review scoped them to both documents explicitly, naming "(and its twin
 * sources/Lombard_Subscription_Agreement_v2.docx)" in the finding itself. Two
 * of its twelve are deliberately absent: `debt-vocabulary-...` names the FRPA,
 * the Equipment Lease and the ISO PRA and not this document, and
 * `el-3-8-software-licence-has-no-survival-...` was NARROWED to the Equipment
 * Lease during refutation — the harm needs a purchase option and title
 * passage, and §3.7 here has neither.
 */
export const SUBSCRIPTION_CLAUSE_MODULES = {
  agreement: SUBSCRIPTION_AGREEMENT,
  guaranty: SUBSCRIPTION_GUARANTY,
} as const;

export const SUBSCRIPTION_LIBRARY: McaClause[] = Object.values(SUBSCRIPTION_CLAUSE_MODULES).flat();
