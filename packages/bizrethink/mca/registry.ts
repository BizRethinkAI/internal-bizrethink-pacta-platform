import { FL_DISCLOSURE } from './content/statutes/fl';
import { GA_DISCLOSURE } from './content/statutes/ga';
import { KS_DISCLOSURE } from './content/statutes/ks';
import { LA_DISCLOSURE } from './content/statutes/la';
import { MO_DISCLOSURE } from './content/statutes/mo';
import { TX_DISCLOSURE } from './content/statutes/tx';
import { UT_DISCLOSURE } from './content/statutes/ut';
import type { ContentStatute } from './content/types';
import type { McaJurisdiction } from './jurisdictions';
import { CA_OFFER_SUMMARY } from './prescribed/forms/ca-offer-summary';
import { CT_DISCLOSURE } from './prescribed/forms/ct-disclosure';
import { NY_OFFER_SUMMARY } from './prescribed/forms/ny-offer-summary';
import { VA_DISCLOSURE } from './prescribed/forms/va-disclosure';
import type { PrescribedForm } from './prescribed/types';
import type { McaDisclosure } from './provenance/verify';

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
export const PRESCRIBED_FORMS: readonly PrescribedForm[] = [
  CA_OFFER_SUMMARY,
  CT_DISCLOSURE,
  NY_OFFER_SUMMARY,
  VA_DISCLOSURE,
];

export const CONTENT_STATUTES: readonly ContentStatute[] = [
  FL_DISCLOSURE,
  GA_DISCLOSURE,
  KS_DISCLOSURE,
  LA_DISCLOSURE,
  MO_DISCLOSURE,
  TX_DISCLOSURE,
  UT_DISCLOSURE,
];

export const MCA_DISCLOSURES: readonly McaDisclosure[] = [...PRESCRIBED_FORMS, ...CONTENT_STATUTES];

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
