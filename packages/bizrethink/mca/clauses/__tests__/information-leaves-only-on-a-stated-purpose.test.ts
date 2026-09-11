import { describe, expect, it } from 'vitest';

import { selectClauses } from '../../engine/select-clauses';
import { LOMBARD_FACTS, type McaFacts } from '../facts';
import { libraryFor } from '../library';

/**
 * INFORMATION LEAVES THE MERCHANT ONLY ON A STATED PURPOSE, OR THIS FAILS.
 *
 * The nine clauses of the `data-and-channel` cluster are the document's data
 * plumbing: what Buyer may collect (§§4.3, 4.4, 4.16, Exhibit C), what Buyer may
 * do with it (§4.7), where it may go (§§7.15, 7.23), how Buyer may reach a human
 * (§7.18), and who else is in the channel (§7.21). Read one at a time each is a
 * housekeeping clause. Read together they are a **second agreement** — one in
 * which Buyer investigates without limit, discloses without a recipient,
 * reports without a criterion, calls without a revocable consent, walks in
 * without notice, and is held harmless for all of it.
 *
 * SO THE PROPERTY IS STATED OVER THE SET, for the reason
 * `personal-liability-is-section-9-only` gives: the defect was never in a
 * clause, it was in the conjunction, and a per-clause assertion passes on every
 * member of it. That file found the fifth route to a guarantor by asserting over
 * the corpus rather than over its ten, and it found the one no brief named —
 * §7.21's indemnity for an ISO's acts, which is this cluster's to close.
 *
 * FIVE ROUTES, and each is a way the data channel turns into something else:
 *
 *   1. **Open-ended authority.** "as Buyer deems necessary", "as it deems
 *      appropriate", "without further notice to Merchant", "qualification or
 *      continuation in this program" — an authority with no purpose, no
 *      recipient and no end.
 *   2. **A release for how the information was used.** §4.7 waived "any claim
 *      for damages" for any investigation or disclosure the Agreement permits;
 *      §7.23 released every claim "arising from such reporting". A duty with a
 *      release attached is not a duty.
 *   3. **A data event made a default.** §4.16 made loss of a Plaid connection an
 *      Event of Default under a §6.1.1 that no longer exists — and §6.1 now says
 *      in terms that "a loss of access to information or to a system" is not one.
 *   4. **The channel used as leverage.** A do-not-call override, a consent
 *      revocable only for contact "not required to service this Agreement",
 *      premises entry "without prior notice", and a MATCH report as payment
 *      pressure.
 *   5. **Channel liability pointed at the merchant.** The ISO indemnity: a
 *      human personally answerable, without limit, for a broker's acts.
 *
 * WHAT IT DOES NOT PROVE, and the list is longer here than anywhere else in this
 * package. **Not one of the statutes this cluster turns on is vendored in this
 * repository.** The FCRA, the TCPA, the FCC's revocation orders and the card
 * networks' MATCH rules are all live in these nine clauses and nobody on this
 * project has read a primary source for any of them. `mca/sources/` holds
 * eleven state commercial-financing statutes and none of these. Every assertion
 * below is about what our own words say, never about whether they are lawful.
 *
 * IT WAS RED BEFORE THE REWRITE: on all five routes, on every affirmative
 * requirement of all nine clauses, on §4.16's dead §6.1.1, on both gates, and
 * on the FCRA-conclusion detector. The anti-vacuity blocks are the lesson from
 * the two assertions in this package that filtered on `Divergence` kinds that do
 * not exist and passed green for a day.
 */
const clauses = libraryFor('frpa');

const clause = (slug: string) => {
  const found = clauses.find((entry) => entry.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not in the FRPA library`);
  }

  return found;
};

const body = (slug: string) => clause(slug).body;

const FINANCIAL = 'frpa.financial-condition-4-3';
const HISTORY = 'frpa.transaction-history-4-4';
const PROTECTION = 'frpa.protection-of-information-4-7';
const MONITORING = 'frpa.electronic-account-monitoring-authorization-plaid-4-16';
const REPORTING = 'frpa.reporting-7-15';
const COMMUNICATIONS = 'frpa.communications-recording-and-premises-access-7-18';
const ISO = 'frpa.independent-sales-organizations-and-brokers-7-21';
const NETWORK = 'frpa.tmf-match-reporting-consent-and-release-7-23';
const RELEASE = 'frpa.exhibit-c-permission-to-release';

/** The nine this cluster owns. */
const MINE = [FINANCIAL, HISTORY, PROTECTION, MONITORING, REPORTING, COMMUNICATIONS, ISO, NETWORK, RELEASE];

describe('the cluster knows which nine clauses it is', () => {
  it('holds nine, each in the FRPA library', () => {
    expect(MINE).toHaveLength(9);
    expect(new Set(MINE).size).toBe(9);

    for (const slug of MINE) {
      expect(clause(slug).instrument).toBe('frpa');
    }
  });
});

/**
 * The five routes, as detectors over the whole FRPA.
 *
 * Each carries the v4 sentence it was written against, and the anti-vacuity
 * block below asserts the pattern actually fires on it. A detector that cannot
 * be shown to fire is not evidence of anything, however specific it reads.
 */
const ROUTES: { route: string; pattern: RegExp; why: string; firesOn: string }[] = [
  {
    route: 'open-ended authority',
    pattern: /deems? (?:it )?(?:necessary|appropriate|proper)/i,
    why: 'an authority whose scope is whatever Buyer decides it is has no scope',
    firesOn: 'other financial documentation as Buyer deems necessary prior to or at any time after execution',
  },
  {
    route: 'open-ended authority',
    pattern: /without further notice to/i,
    why: 'a disclosure Merchant is never told about cannot be corrected, disputed or stopped',
    firesOn:
      'reserve the right, without further notice to Merchant, to provide information to such industry associations',
  },
  {
    route: 'open-ended authority',
    pattern: /continuation in this program/i,
    why: 'a completed purchase has no ongoing credit qualification to continue in',
    firesOn: 'processing history from time to time to determine qualification or continuation in this program',
  },
  {
    route: 'open-ended authority',
    pattern: /photocopy of this authorization/i,
    why: 'a photocopy standing in for a signed instrument is how a release nobody executed is treated as executed',
    firesOn: 'A photocopy of this authorization will be deemed acceptable for release of financial information.',
  },
  /*
    BOTH OF THESE NAME THEIR SUBJECT, and the first draft of them did not.
    `/waives?[^.]{0,90}(?:any claim|claim for damages)/` also fired on §7.11's
    class waiver and on §4.1's waiver against the Bank for acting on Buyer's
    split instructions. Neither is a release for how INFORMATION was used, and
    conceding two clauses that are not on this route would have been recording
    the detector's imprecision as somebody else's defect.
  */
  {
    route: 'a release for how the information was used',
    pattern: /(?:waives?|releases?)[^.]{0,160}claim[^.]{0,160}investigation/i,
    why: 'an information duty with a damages waiver attached is not a duty',
    firesOn:
      'Merchant and Guarantor(s) waive to the maximum extent permitted by law any claim for damages against Buyer ' +
      'or any of its affiliates relating to any (i) investigation undertaken by or on behalf of Buyer',
  },
  {
    route: 'a release for how the information was used',
    pattern: /(?:waives?|releases?)[^.]{0,160}claim[^.]{0,160}reporting/i,
    why: 'a release for reporting removes the only remedy an inaccurate report has',
    firesOn:
      'Merchant waives and releases Buyer and its assignees, servicers, and processor partners from any claim ' +
      'arising from such reporting that is consistent with applicable law',
  },
  {
    route: 'a data event made a default',
    pattern: /Section 6\.1\.\d/,
    why: '§6.1 has three lettered limbs and no numbered ones, so the citation resolves to nothing',
    firesOn: 'shall constitute an Event of Default under Section 6.1.1, except that a lapse',
  },
  {
    route: 'a data event made a default',
    pattern: /connectivity[^.]{0,140}Event of Default/i,
    why: '§6.1 says a loss of access to information or to a system is expressly not an Event of Default',
    firesOn:
      'prolonged loss of Plaid connectivity (more than five (5) consecutive Workdays without Buyer’s prior written ' +
      'consent) shall constitute an Event of Default',
  },
  /*
    THE OVERRIDE, NOT THE TERM. A bare `/do-not-call/i` would fire on the
    replacement's own denial of the override — "supplies no blanket do-not-call
    override" — which is the sentence that closes the route. A detector that
    cannot tell a prohibition from the thing prohibited would have forced the
    fix to be written without naming what it fixes. The affirmative assertion in
    the §7.18 block requires that denial to be present; this requires v4's
    override to be absent.
  */
  {
    route: 'the channel used as leverage',
    pattern: /regardless of [^.]{0,40}do-not-call/i,
    why: 'a corporate signature cannot override a number’s statutory registration',
    firesOn: 'including cellular phone numbers and landlines, regardless of their inclusion on any do-not-call list',
  },
  {
    route: 'the channel used as leverage',
    pattern: /without prior notice/i,
    why: 'entering premises without notice is a self-help remedy wearing an inspection right’s clothes',
    firesOn: 'the right to enter and observe Merchant’s premises during business hours, without prior notice',
  },
  {
    route: 'channel liability pointed at the merchant',
    pattern: /act or omission by any ISO/i,
    why: 'unlimited liability for a broker the merchant did not choose and cannot control',
    firesOn: 'and expert fees) resulting from any act or omission by any ISO.',
  },
  {
    route: 'channel liability pointed at the merchant',
    pattern: /agrees? to indemnify/i,
    why: 'the third route to a guarantor, outside Section 9 — found by the guaranty cluster, closed here',
    firesOn: 'Each Merchant and Guarantor agrees to indemnify and hold harmless Buyer and its officers',
  },
];

/**
 * Clauses that still offend and belong to somebody else.
 *
 * NAMED WITH AN OWNER AND A REASON, never silently skipped — the rule
 * `personal-liability-is-section-9-only` states and the reason its §7.21 entry
 * existed long enough for this cluster to find it. **When the owner fixes one,
 * delete its line.**
 */
const CONCEDED: Record<string, string> = {};

describe('no clause turns the data channel into something else', () => {
  /**
   * The set-level assertion, and the one this cluster exists for.
   *
   * Stated over every FRPA clause rather than over the nine, because §7.21 was
   * reachable only this way: it is filed under channel oversight, the memo does
   * not raise it under Section 9, and no brief named it.
   */
  it('leaves no clause of the FRPA on any of the five routes, or names who owns the one it could not move', () => {
    const offenders = clauses
      .filter((entry) => ROUTES.some(({ pattern }) => pattern.test(entry.body)))
      .map((entry) => entry.slug)
      .filter((slug) => CONCEDED[slug] === undefined)
      .sort();

    expect([...new Set(offenders)]).toEqual([]);
  });

  it.each(ROUTES)('the detector for "$why" can actually fire', ({ pattern, firesOn }) => {
    expect(pattern.test(firesOn)).toBe(true);
  });

  it('concedes only clauses that exist and belong to somebody else', () => {
    for (const slug of Object.keys(CONCEDED)) {
      expect(clause(slug).instrument).toBe('frpa');
      expect(MINE).not.toContain(slug);
      expect(CONCEDED[slug]?.length ?? 0).toBeGreaterThan(40);
    }
  });
});

/**
 * NO CLAUSE DECIDES A STATUTORY QUESTION FOR THE READER.
 *
 * The standing brief forbids a statutory conclusion in a clause body, and this
 * cluster is where the temptation is strongest: the 2026-09-09 memo refuted our
 * register's finding that Lombard has no FCRA authority, on the ground that
 * permissible purpose may lawfully sit in the Permission to Release. **Neither
 * conclusion may be written down.** A form that declares its own statutory
 * effect is the exact laundering the library README's rule 1 is about —
 * `permission-to-release` §4 does it today ("The Personal Guarantor’s signature
 * below constitutes the 'written instructions' of the consumer required for
 * permissible-purpose credit-report access under FCRA §604(a)(2)") while
 * REVIEW-01 records that the form has no guarantor signature line for that
 * signature to go on.
 */
const STATUTORY_CONCLUSION: { pattern: RegExp; why: string; firesOn: string }[] = [
  {
    pattern: /constitutes? the (?:“|"|')?written instructions/i,
    why: 'a form declaring that its own signature satisfies a statute decides the question it should be asking',
    firesOn: 'The Personal Guarantor’s signature below constitutes the “written instructions” of the consumer',
  },
  {
    pattern: /(?:has|have|lacks?|do(?:es)? not have|no)\s+(?:a\s+|the\s+)?permissible purpose/i,
    why: 'whether a permissible purpose exists is a fact about a transaction, not a term of one',
    firesOn: 'Buyer has a permissible purpose for each report obtained under this Agreement.',
  },
  {
    pattern: /complies with the Fair Credit Reporting Act|satisfies the Fair Credit Reporting Act/i,
    why: 'a recital of compliance is worth nothing and reads as a finding',
    firesOn: 'This authorization complies with the Fair Credit Reporting Act.',
  },
];

describe('no clause states a conclusion about a statute nobody here has read', () => {
  it('leaves no statutory conclusion in any FRPA body', () => {
    const offenders = clauses
      .filter((entry) => STATUTORY_CONCLUSION.some(({ pattern }) => pattern.test(entry.body)))
      .map((entry) => entry.slug)
      .sort();

    expect(offenders).toEqual([]);
  });

  it.each(STATUTORY_CONCLUSION)('the detector for "$why" can actually fire', ({ pattern, firesOn }) => {
    expect(pattern.test(firesOn)).toBe(true);
  });
});

describe('§4.3 authorises information, and stops being an investigation', () => {
  it('binds the request to the purpose it was given for', () => {
    const text = body(FINANCIAL);

    expect(text).toMatch(/proportionate/);
    expect(text).toMatch(/business financial information/);
    expect(text).toMatch(/before the Purchase Date/);
  });

  it('limits a consumer report on an individual without deciding whether one is available', () => {
    const text = body(FINANCIAL);

    expect(text).toMatch(/only with a permissible purpose/);
    expect(text).toMatch(/documented separately/);
    expect(text).toMatch(/recurring/);
  });

  /**
   * The memo's own limit, and the brief calls it right: a business signature
   * cannot authorise a consumer report on a natural person. It is stated in the
   * operative, ungated clause rather than only in the gated exhibit.
   */
  it('says a Merchant signature does not reach a person who did not sign', () => {
    expect(body(FINANCIAL)).toMatch(/does not authorize a consumer report on any individual who has not signed/i);
  });

  it('sends the information itself to §4.7 and the record mechanics to §5.2', () => {
    const text = body(FINANCIAL);

    expect(text).toContain('Section 4.7');
    expect(text).toContain('Section 5.2');
  });
});

describe('§4.4 is a servicing authority, not a second underwriting', () => {
  it('separates underwriting before funding from verification after it', () => {
    const text = body(HISTORY);

    expect(text).toMatch(/before the Purchase Date/);
    expect(text).toMatch(/Purchased Receipts/);
  });

  it('says a decline after funding gives Buyer nothing', () => {
    const text = body(HISTORY);

    expect(text).toMatch(/does not permit Buyer to revoke the purchase, require repayment, or suspend/i);
  });

  it('is subject to the three clauses that limit it', () => {
    const text = body(HISTORY);

    expect(text).toContain('Section 4.3');
    expect(text).toContain('Section 4.7');
    expect(text).toContain('Section 4.16');
  });
});

/**
 * §4.7 is load-bearing in a way it was not a day ago.
 *
 * `representations` rewrote §5.16 to point here — *"Buyer may use and disclose
 * information given under this Section only as Section 4.7 permits"* — instead
 * of restating a sharing rule of its own. So §4.7 must be a complete policy on
 * both verbs, use and disclosure, or §5.16 now points at a gap.
 */
describe('§4.7 is the one information policy the others point at', () => {
  it('limits use and disclosure both, by purpose', () => {
    const text = body(PROTECTION);

    expect(text).toMatch(/only for/);
    expect(text).toMatch(/minimum necessary/);
    expect(text).toMatch(/confidentiality, security(?:,)? and purpose restrictions/);
  });

  it('names where a wider disclosure is allowed to come from', () => {
    const text = body(PROTECTION);

    expect(text).toContain('Section 7.15');
    expect(text).toContain('Section 7.23');
  });

  it('carries the safeguards, the retention rule and the correction right', () => {
    const text = body(PROTECTION);

    expect(text).toMatch(/safeguards/);
    expect(text).toMatch(/secure deletion|secure-deletion/);
    expect(text).toMatch(/correct inaccurate information/);
  });

  it('controls an inconsistent sharing provision instead of being overridden by one', () => {
    const text = body(PROTECTION);

    expect(text).toMatch(/controls any inconsistent/i);
    expect(text).toMatch(/waives no liability|does not waive/i);
  });

  it('forbids sale and unrelated marketing', () => {
    const text = body(PROTECTION);

    expect(text).toMatch(/shall not sell/);
    expect(text).toMatch(/unrelated marketing/);
  });
});

describe('§4.16 is read-only access, and nothing else', () => {
  it('keeps the read-only limit and the bar on a debit', () => {
    const text = body(MONITORING);

    expect(text).toMatch(/read-only/);
    expect(text).toMatch(/never permits a debit, transfer(?:,)? or withdrawal/i);
    expect(text).toContain('Section 2.3');
  });

  it('drops the ongoing creditworthiness review', () => {
    expect(body(MONITORING)).not.toMatch(/ongoing creditworthiness review/i);
  });

  it('makes the connection optional and supplies the alternative', () => {
    const text = body(MONITORING);

    expect(text).toMatch(/Merchant may authorize/);
    expect(text).toMatch(/settlement statements|account statements/);
    expect(text).toMatch(/reasonable alternative/);
  });

  /**
   * The cross-reference the spine handed over. §6.1.1 does not exist, and a
   * Plaid outage is expressly in §6.1's not-a-default list, so the citation was
   * wrong twice over. It is registered in `select-clauses.test.ts`'s
   * `KNOWN_GAPS` and that entry is deleted in the same change as this.
   */
  it('stops making a lapse a default and points at the §6.1 that exists', () => {
    const text = body(MONITORING);

    expect(text).not.toContain('Section 6.1.1');
    expect(text).toContain('Section 6.1');
    expect(text).toMatch(/is not an Event of Default/);
  });

  /**
   * Revoking a data feed and hiding money are different acts, and only the
   * second is §6.1(b).
   */
  it('separates revoking access from intentional diversion', () => {
    const text = body(MONITORING);

    expect(text).toContain('Section 6.1(b)');
    expect(text).toMatch(/good-faith revocation/);
  });

  it('ends the access and applies §4.7 to what it collected', () => {
    const text = body(MONITORING);

    expect(text).toMatch(/shall end active access/);
    expect(text).toContain('Section 4.7');
    expect(text).toContain('Section 2.6');
  });

  it('keeps credentials and raw transaction data out of §7.15', () => {
    const text = body(MONITORING);

    expect(text).toContain('Section 7.15');
    expect(text).toMatch(/no bank credentials/i);
  });
});

describe('§7.15 reports performance, not a delinquency', () => {
  /**
   * The single sentence the owner's note calls the FCRA exposure: receipts that
   * never arose are not a missed payment, and this Agreement fixes no payment
   * to miss.
   */
  it('forbids reporting non-generation as a delinquent debt', () => {
    const text = body(REPORTING);

    expect(text).toMatch(/delinquent/);
    expect(text).toMatch(/non-generation of Purchased Receipts|failure of Purchased Receipts to arise/);
    expect(text).toMatch(/fixed (?:debt|payment)/);
  });

  it('names the recipient and the purpose instead of an undefined association', () => {
    const text = body(REPORTING);

    expect(text).not.toMatch(/industry associations/i);
    expect(text).toMatch(/specifically identified/);
    expect(text).toMatch(/request the recipient/);
  });

  it('requires lawful authority before a personal report and leaves §4.7 in charge', () => {
    const text = body(REPORTING);

    expect(text).toContain('Section 4.7');
    expect(text).toMatch(/accuracy, adverse-action(?:,)? and dispute/);
    expect(text).toMatch(/No raw account data/i);
  });
});

describe('§7.18 contacts a person the law lets Buyer contact', () => {
  it('takes consent from the person entitled to give it, for the number given', () => {
    const text = body(COMMUNICATIONS);

    expect(text).toMatch(/legally entitled to provide it/);
    expect(text).toMatch(/specified number/);
  });

  it('makes revocation real, and stops servicing being an exception to it', () => {
    const text = body(COMMUNICATIONS);

    expect(text).toMatch(/any reasonable means/);
    expect(text).toMatch(/does not by itself preserve consent|does not preserve consent/);
    expect(text).not.toMatch(/not required to service this Agreement/);
  });

  it('separates marketing consent and keeps it optional', () => {
    const text = body(COMMUNICATIONS);

    expect(text).toMatch(/obtained separately/);
    expect(text).toMatch(/not a condition of funding/);
    expect(text).toMatch(/no blanket do-not-call override|supplies no blanket/i);
  });

  it('stops a corporate signature supplying every future call participant’s recording consent', () => {
    const text = body(COMMUNICATIONS);

    expect(text).toMatch(/each participant/);
    expect(text).toMatch(/unrecorded alternative/);
  });

  it('makes premises access consensual or judicial', () => {
    const text = body(COMMUNICATIONS);

    expect(text).toMatch(/reasonable advance notice/);
    expect(text).toMatch(/contemporaneous consent/);
    expect(text).toMatch(/breach of the peace/);
    expect(text).toContain('Section 6.2');
  });
});

/**
 * §7.21 IS THE ONE NO BRIEF NAMED.
 *
 * `personal-liability-is-section-9-only` conceded it by name, to this cluster,
 * with the sentence quoted. That concession is deleted in the same change as
 * this file, because a concession left standing after the defect is fixed is a
 * line of a test that can no longer be red.
 */
describe('§7.21 stops making the merchant answer for the broker', () => {
  it('gives no indemnity to Buyer for an ISO’s conduct', () => {
    const text = body(ISO);

    expect(text).toMatch(/do not indemnify Buyer/);
    expect(text).not.toMatch(/act or omission by any ISO/);
    expect(text).toContain('Section 7.9');
  });

  it('does not let an "independent" label decide agency', () => {
    const text = body(ISO);

    expect(text).toMatch(/actual or apparent authority/);
    expect(text).toMatch(/does not waive|disclaims no/);
  });

  /**
   * The owner's note, and the departure from a promise merely to ask: Buyer
   * refunds and then pursues the ISO, because Buyer can and the merchant cannot.
   */
  it('gives the merchant a direct remedy against Buyer for an unauthorised channel fee', () => {
    const text = body(ISO);

    expect(text).toMatch(/without requiring Merchant to recover from the ISO first/);
    expect(text).toMatch(/ten \(10\) Workdays/);
    expect(text).toMatch(/may separately pursue the ISO/);
  });

  it('puts Buyer’s own channel controls in the clause', () => {
    const text = body(ISO);

    expect(text).toMatch(/licensing or registration/);
    expect(text).toMatch(/monitoring/);
  });
});

describe('§7.23 reports to a network only on the network’s own criteria', () => {
  it('requires an authorized reporter and documented facts', () => {
    const text = body(NETWORK);

    expect(text).toMatch(/authorized under the applicable card-network rules/);
    expect(text).toMatch(/documented facts/);
    expect(text).toContain('Section 4.7');
  });

  it('forbids a report, or a threat of one, as payment pressure', () => {
    const text = body(NETWORK);

    expect(text).toMatch(/shall not report or threaten to report/);
    expect(text).toMatch(/disputed/);
  });

  it('releases nothing', () => {
    const text = body(NETWORK);

    expect(text).toMatch(/do not release claims/);
    expect(text).toMatch(/inaccurate, unauthorized/);
    expect(text).toMatch(/correction/);
  });
});

describe('Exhibit C establishes the release instead of assuming it', () => {
  it('requires the whole form before signature, separately executed', () => {
    const text = body(RELEASE);

    expect(text).toMatch(/in full before signature/);
    expect(text).toMatch(/separately executed/);
    expect(text).toMatch(/delivered to (?:the )?(?:each )?signer/);
  });

  it('requires identity, uses, duration, recipients and the statutory notices', () => {
    const text = body(RELEASE);

    // `toContain`, not `toMatch`: `{` and `}` are quantifier syntax in a regex.
    expect(text).toContain('{{funder}}');
    expect(text).toMatch(/information sources/i);
    expect(text).toMatch(/permitted uses/);
    expect(text).toMatch(/duration/);
    expect(text).toMatch(/notice/);
  });

  /**
   * The limit the memo is right about, carried through from §4.3: the form must
   * give the individual whose report is pulled somewhere to sign. REVIEW-01
   * found the vendored release has no such line — `ptr-no-guarantor-signature-line`.
   */
  it('requires the individual’s own signature for the individual’s own report', () => {
    const text = body(RELEASE);

    expect(text).toMatch(/signed by that individual|the individual whose report/);
    expect(text).toContain('Section 4.3');
  });

  it('expands nothing', () => {
    const text = body(RELEASE);

    expect(text).toMatch(/unrelated marketing/);
    expect(text).toMatch(/waiver of statutory rights|waives no statutory right/);
  });
});

/**
 * THE GATES, AND THE ONE THE BRIEF ASKED FOR AND ADR 0013 REFUSES.
 *
 * `consumerReportPulled` and `brokerChannel` each gate one clause here, not two.
 *
 * §4.3 is deliberately **not** gated, and this is the ADR 0013 diagnostic
 * applied rather than a convenience: *"if the two limbs bind different parties
 * or answer different questions, the fact is wrong rather than too coarse."*
 * §4.3's first limb is Merchant's grant of access to business records — every
 * funder needs it. Its second is a restriction on Buyer's consumer-report pulls
 * — a funder that pulls none is not harmed by a limit on an act it never takes.
 * Different parties, different questions.
 *
 * And the cross-reference property proves it independently: §5.2 is ungated and
 * cites Section 4.3, so gating §4.3 would dangle for the profile named *"a
 * funder with no broker channel and no consumer report"*.
 */
describe('the gates select the two clauses that are genuinely absent', () => {
  const facts = (over: Partial<McaFacts>): McaFacts => ({ ...LOMBARD_FACTS, ...over });
  const selected = (over: Partial<McaFacts>) =>
    selectClauses({ facts: facts(over), instrument: 'frpa' }).selected.map((entry) => entry.slug);

  it('gives Exhibit C only to a funder that pulls a consumer report', () => {
    const gate = clause(RELEASE).includeWhen;

    expect(gate).not.toBeNull();
    expect(gate?.(facts({ consumerReportPulled: true }))).toBe(true);
    expect(gate?.(facts({ consumerReportPulled: false }))).toBe(false);
  });

  it('gives §7.21 only to a funder with a broker channel', () => {
    const gate = clause(ISO).includeWhen;

    expect(gate).not.toBeNull();
    expect(gate?.(facts({ brokerChannel: true }))).toBe(true);
    expect(gate?.(facts({ brokerChannel: false }))).toBe(false);
  });

  it.each([
    FINANCIAL,
    HISTORY,
    PROTECTION,
    MONITORING,
    REPORTING,
    COMMUNICATIONS,
    NETWORK,
  ])('%s is in every funder’s document', (slug) => {
    expect(clause(slug).includeWhen).toBeNull();
  });

  /**
   * The exhibit and the instrument move together. `instrumentsFor` already
   * drops the whole Permission to Release on the same fact, so an ungated
   * Exhibit C would point the FRPA at an instrument the suite does not contain —
   * a dangling reference that crosses instruments, which
   * `select-clauses.test.ts` cannot see because it checks one at a time.
   */
  it('drops the exhibit exactly where the instrument it refers to is dropped', () => {
    const without = selected({ consumerReportPulled: false });

    expect(without).not.toContain(RELEASE);
    expect(without).toContain(FINANCIAL);
    expect(selected({ consumerReportPulled: true })).toContain(RELEASE);
  });

  it('keeps §5.2’s citation of §4.3 answerable for a funder that pulls no report', () => {
    expect(selected({ consumerReportPulled: false, brokerChannel: false })).toContain(FINANCIAL);
  });
});

/**
 * Rewriting is the moment provenance is easiest to lose, because the new text
 * reads better than what it replaced — which is not the same as being approved.
 */
describe('rewriting changed nothing about provenance', () => {
  it.each(MINE)('%s is still attorney-drafted with no author', (slug) => {
    expect(clause(slug).source).toEqual({ kind: 'attorney-drafted', author: null });
    expect(clause(slug).status).toBe('draft');
  });

  it.each(MINE)('%s still names the review that read it', (slug) => {
    expect(clause(slug).examinedBy.length).toBeGreaterThan(0);
  });

  it.each(MINE)('%s names no tenant', (slug) => {
    expect(body(slug)).not.toMatch(/Lombard|Payzli/);
  });

  /**
   * Authority goes in the code comment, marked UNVERIFIED, never in a body.
   * Nobody here has pulled Richmond Capital, Apollo Funding, NewCo, LG Funding,
   * Principis or Grafton from an official reporter — and nobody has read the
   * FCRA, the TCPA, an FCC order or a card network's rules either.
   */
  it.each(MINE)('%s cites no case in its body', (slug) => {
    expect(body(slug)).not.toMatch(/\bAD3d\b|\bNY3d\b|Richmond Capital|Apollo Funding|LG Funding|Principis|Grafton/);
  });
});
