import { FL_DISCLOSURE } from './content/statutes/fl';
import { GA_DISCLOSURE } from './content/statutes/ga';
import { KS_DISCLOSURE } from './content/statutes/ks';
import { LA_DISCLOSURE } from './content/statutes/la';
import { MO_DISCLOSURE } from './content/statutes/mo';
import { TX_DISCLOSURE } from './content/statutes/tx';
import { UT_DISCLOSURE } from './content/statutes/ut';
import type { ContentStatute } from './content/types';
import type { McaJurisdiction } from './jurisdictions';
import { CA_ITEMIZATION } from './prescribed/forms/ca-itemization';
import { CA_LEASE_FINANCING } from './prescribed/forms/ca-lease-financing';
import { CA_OFFER_SUMMARY } from './prescribed/forms/ca-offer-summary';
import { CT_DISCLOSURE } from './prescribed/forms/ct-disclosure';
import { NY_ITEMIZATION } from './prescribed/forms/ny-itemization';
import { NY_LEASE_FINANCING } from './prescribed/forms/ny-lease-financing';
import { NY_OFFER_SUMMARY } from './prescribed/forms/ny-offer-summary';
import { VA_DISCLOSURE } from './prescribed/forms/va-disclosure';
import type { ItemizationForm } from './prescribed/itemization';
import type { PrescribedForm } from './prescribed/types';
import type { McaDisclosure } from './provenance/verify';
import type { McaTransactionType } from './transactions';

/**
 * Every commercial-financing disclosure the library holds, and the only way to
 * reach one.
 *
 * The three shapes are kept apart because the distinction is load-bearing, not
 * decorative:
 *
 *   prescribed SENTENCES  CA, NY — rows, labels AND exact words, most rows
 *                         closed with "shall include only"
 *   prescribed FORM       CT, VA — labels and order fixed, answers ours
 *   content only          FL, GA, KS, LA, MO, TX, UT — required information,
 *                         wording ours; KS and MO straddle it, dictating every
 *                         label while prescribing no sentence
 */
/**
 * Freeze a spec, all the way down.
 *
 * `readonly` is a compile-time claim and this package's specs are handed to
 * things that read them at runtime — a checker, and now an admin page. The
 * property that matters is that **displaying a spec cannot change it**: no
 * caller may set `status` to `'published'`, stamp a verification date, or edit
 * a prescribed sentence as a side effect of rendering a report about it.
 *
 * Modules are strict-mode, so a write to a frozen object throws rather than
 * failing silently. That is the point — a silent no-op would leave a caller
 * believing it had recorded something.
 */
const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);

    for (const key of Object.getOwnPropertyNames(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }

  return value;
};

export const PRESCRIBED_FORMS: readonly PrescribedForm[] = deepFreeze([
  CA_LEASE_FINANCING,
  CA_OFFER_SUMMARY,
  CT_DISCLOSURE,
  NY_LEASE_FINANCING,
  NY_OFFER_SUMMARY,
  VA_DISCLOSURE,
]);

/**
 * The Itemization of Amount Financed, per state.
 *
 * A third list rather than a fourth entry in `PRESCRIBED_FORMS`, because it is
 * a different shape with a different checker — see `prescribed/itemization.ts`.
 * Folding it in would mean `checkFormConformity` being handed a document with
 * no prescribed row count and no closed rows, which is how a checker starts
 * reporting defects in correct documents.
 */
export const ITEMIZATIONS: readonly ItemizationForm[] = deepFreeze([CA_ITEMIZATION, NY_ITEMIZATION]);

export const CONTENT_STATUTES: readonly ContentStatute[] = deepFreeze([
  FL_DISCLOSURE,
  GA_DISCLOSURE,
  KS_DISCLOSURE,
  LA_DISCLOSURE,
  MO_DISCLOSURE,
  TX_DISCLOSURE,
  UT_DISCLOSURE,
]);

export const MCA_DISCLOSURES: readonly McaDisclosure[] = Object.freeze([
  ...PRESCRIBED_FORMS,
  ...ITEMIZATIONS,
  ...CONTENT_STATUTES,
]);

/**
 * The disclosures that apply in one jurisdiction.
 *
 * Exact equality, with no portable tier to union in — see `jurisdictions.ts`
 * for why this is stricter than the lease library's `libraryFor` rather than a
 * simplification of it. Nothing from any other state can reach the result,
 * whatever a caller imports by mistake, and that is the property that makes a
 * twelfth state safe to add.
 *
 * Anything assembling a document for a state goes through here. Reaching past
 * it to an exported spec — `CA_OFFER_SUMMARY` is importable, since the
 * conformity tests need it — puts the caller back in the position that shipped
 * California's form carrying New York's sentence.
 */
export const disclosuresFor = (jurisdiction: McaJurisdiction): McaDisclosure[] =>
  MCA_DISCLOSURES.filter((disclosure) => disclosure.jurisdiction === jurisdiction);

/**
 * The prescribed forms one state requires for one KIND of financing.
 *
 * A SECOND FILTER, NOT A REPLACEMENT. `disclosuresFor` answers "what does this
 * state prescribe", which is what the read-only conformity surface wants. This
 * answers "which of those describe the transaction in front of me", which is a
 * different question and became a real one the moment California went from one
 * spec to three: §915's table asserts a purchase option, an anticipated cost of
 * acquiring property and a lease term, none of which a sales-based advance has.
 * Handing it to a sales-based deal is the same class of defect as handing New
 * York's sentence to a California form.
 *
 * §956 and §600.17 come back for every transaction type: §956(a) applies
 * "when a provider provides a disclosure … under sections 910 through 917",
 * which is all six tables.
 *
 * READ THE NAME LITERALLY. It returns PRESCRIBED FORMS, and it is not a list of
 * everything a provider must send. The seven content-only statutes are excluded
 * because `ContentStatute` carries no transaction type, and it carries none
 * because settling the scope of seven acts means reading seven acts — which has
 * not been done, and guessing at it here would be exactly the laundering of
 * judgement into authority that REVIEW-01 found in the inherited documents.
 */
export const prescribedFormsForTransaction = (
  jurisdiction: McaJurisdiction,
  transaction: McaTransactionType,
): (PrescribedForm | ItemizationForm)[] =>
  [...PRESCRIBED_FORMS, ...ITEMIZATIONS].filter(
    (form) =>
      form.jurisdiction === jurisdiction &&
      (form.transaction === transaction || form.transaction === 'any-commercial-financing'),
  );
