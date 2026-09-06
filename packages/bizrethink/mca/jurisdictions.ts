/**
 * Which state's law a disclosure is a creature of.
 *
 * Eleven states require a commercial-financing disclosure and no two of them
 * require the same one. The axis exists so that adding a twelfth is safe:
 * `disclosuresFor` is the only way to reach a spec, and it cannot hand
 * California's words to a New York document however a caller imports.
 *
 * That is not a hypothetical guard. Our California disclosure shipped to
 * production carrying New York's phrasing of a prescribed sentence, inside a
 * row 10 CCR §914 closes with "shall include only". It survived a human reading
 * both regulations side by side.
 *
 * THERE IS NO PORTABLE TIER, AND THAT IS DELIBERATE.
 *
 * The lease library's `libraryFor` unions a `generic` and a `US` tier into
 * every jurisdiction, because 35 of its clauses depend on no state's law.
 * Nothing here does. There is no federal commercial-financing disclosure and no
 * disclosure that travels; every one of the eleven is a creature of one state's
 * statute or regulation. So this filter is exact equality, which is strictly
 * safer than a union — there is no tier through which anything could leak.
 *
 * If a federal disclosure ever arrives, adding it means widening this type, and
 * widening this type means revisiting the filter. That is the intended cost.
 *
 * WHAT MUST NEVER GO IN HERE. "Lombard-specific" is not a jurisdiction.
 * Federal, state, regulatory and generic are jurisdictional; product- and
 * tenant-specific are a different axis entirely. Folding a tenant into this
 * union would quietly turn `disclosuresFor` from a statement about which law
 * applies into a statement about who is asking, and the property that makes
 * adding a state safe would be gone. A per-tenant distinction belongs on the
 * document that uses these specs, never on the specs.
 */
export type McaJurisdiction =
  | 'US-CA'
  | 'US-CT'
  | 'US-FL'
  | 'US-GA'
  | 'US-KS'
  | 'US-LA'
  | 'US-MO'
  | 'US-NY'
  | 'US-TX'
  | 'US-UT'
  | 'US-VA';

/**
 * Every jurisdiction the library holds a disclosure for.
 *
 * Listed rather than derived from the specs: a test asserts the two agree, and
 * that assertion is only worth running because the two are written down
 * independently. Deriving this from `MCA_DISCLOSURES` would make it a tautology.
 */
export const MCA_JURISDICTIONS: readonly McaJurisdiction[] = [
  'US-CA',
  'US-CT',
  'US-FL',
  'US-GA',
  'US-KS',
  'US-LA',
  'US-MO',
  'US-NY',
  'US-TX',
  'US-UT',
  'US-VA',
];

export const JURISDICTION_NAMES: Record<McaJurisdiction, string> = {
  'US-CA': 'California',
  'US-CT': 'Connecticut',
  'US-FL': 'Florida',
  'US-GA': 'Georgia',
  'US-KS': 'Kansas',
  'US-LA': 'Louisiana',
  'US-MO': 'Missouri',
  'US-NY': 'New York',
  'US-TX': 'Texas',
  'US-UT': 'Utah',
  'US-VA': 'Virginia',
};
