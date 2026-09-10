import { describe, expect, it } from 'vitest';

import { selectClauses } from '../../engine/select-clauses';
import { LOMBARD_FACTS, type McaFacts } from '../facts';
import { libraryFor } from '../library';

/**
 * PERSONAL LIABILITY LIVES IN SECTION 9, OR THIS FAILS.
 *
 * Lombard's one genuinely better-than-market term is a **limited conduct
 * guaranty**: §9.2 makes a human answerable for fraud, materially false
 * present-fact statements and intentional diversion, and says in terms that a
 * decline in sales, a business failure, insolvency and a bankruptcy filing
 * create no liability at all. All three MCA forms filed as SEC exhibits in
 * 2024-2026 guarantee *"all representations, warranties and covenants"*
 * instead. The narrow version is the unusual one and it is the product.
 *
 * **And four other clauses gave it back.** That is why this file states its
 * property over the SET and not over a clause:
 *
 *   - §7.9 made Merchant and Guarantor *"jointly and severally"* liable to
 *     indemnify Buyer and any third-party servicer for **every** Event of
 *     Default — a second, wider guaranty living in the miscellaneous section,
 *     which reached §9.2 not at all;
 *   - §9.4's last sentence reinstated the Guarantor's obligation for anything
 *     Buyer must return in a bankruptcy clawback, so bankruptcy reached the
 *     human after all, in direct contradiction of §9.2 and §6.1;
 *   - §5.11 warranted *absolute* title against unknown liens, statutory
 *     interests and equities, and §5.13 warranted judicial conclusions about
 *     fraudulent transfer, preference, equitable subordination and
 *     voidability — facts no merchant can know, each made personally
 *     actionable by §9.2(b);
 *   - Section 5's lead-in made every one of those present-fact statements a
 *     continuing promise, so later deterioration became breach.
 *
 * Read one at a time each is arguable. Read together they are a full-performance
 * guaranty assembled out of parts, and **a clause-by-clause assertion cannot see
 * that.** `remedies-reach-no-further` asks whether Section 6's remedies reach
 * too far; `representations-are-present-fact` asks whether a representation is a
 * promise. Neither can see a guaranty that is narrow in Section 9 and wide
 * everywhere else, which is the only defect this cluster exists to remove.
 *
 * WHAT IT DOES NOT PROVE. That any of this text is lawful, that a court would
 * enforce the allocation, or that counsel would sign it. Every clause named
 * here is `attorney-drafted` with a null author and `assertPublishable` refuses
 * all ten.
 *
 * IT WAS RED BEFORE THE REWRITE — on the set-level assertion below (§7.9), on
 * all five routes, on both dead cross-references, on every §9.2 requirement, on
 * §9.4, §9.5, §9.6, §10.2 and §10.4, and on every gate. The anti-vacuity block
 * is the lesson from two assertions in the disclosure half of this package that
 * filtered on `Divergence` kinds that do not exist and passed green for a day:
 * every detector below is proved able to fire, against the v4 sentence it was
 * written to catch, rather than being trusted because it looks specific.
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

const LEAD_IN = 'frpa.representations-lead-in';
const TITLE = 'frpa.unencumbered-receipts-5-11';
const OTHER_CONTRACTS = 'frpa.defaults-under-other-contracts-improper-transfers-5-13';
const INDEMNITY = 'frpa.indemnification-7-9';
const GUARANTY = 'frpa.guaranty-of-performance-9-2';
const WAIVERS = 'frpa.guarantor-waivers-9-4';
const JOINT = 'frpa.joint-and-several-liability-9-5';
const ACKNOWLEDGEMENT = 'frpa.guarantor-acknowledgement-9-6';
const SERVICE_WAIVER = 'frpa.section-10-2';
const SERVICE_ADDRESS = 'frpa.section-10-4';

/** The ten this cluster owns. */
const MINE = [
  LEAD_IN,
  TITLE,
  OTHER_CONTRACTS,
  INDEMNITY,
  GUARANTY,
  WAIVERS,
  JOINT,
  ACKNOWLEDGEMENT,
  SERVICE_WAIVER,
  SERVICE_ADDRESS,
];

describe('the cluster knows which ten clauses it is', () => {
  it('holds ten, each in the library', () => {
    expect(MINE).toHaveLength(10);
    expect(new Set(MINE).size).toBe(10);

    for (const slug of MINE) {
      expect(clause(slug).instrument).toBe('frpa');
    }
  });
});

/**
 * Half one. Vocabulary that puts a human on the hook outside Section 9.
 *
 * Each entry carries the v4 sentence it was written against, and the block
 * below asserts that the pattern actually fires on it. A detector that cannot
 * be shown to fire is not evidence of anything, however specific it reads.
 */
const PERSONAL_LIABILITY: { pattern: RegExp; why: string; firesOn: string }[] = [
  {
    pattern: /jointly and severally/i,
    why: 'joint-and-several liability of Merchant and Guarantor is a full-performance guaranty by another name',
    firesOn: 'Merchant and Guarantor(s) jointly and severally shall assume liability for and hereby agree to indemnify',
  },
  {
    pattern: /shall assume liability/i,
    why: 'assuming liability for an Event of Default is exactly what §9.2 says the Guaranty does not do',
    firesOn: 'Merchant and Guarantor(s) jointly and severally shall assume liability for',
  },
  {
    pattern: /agrees? to indemnify/i,
    why: 'an indemnity given by a guarantor is a first-party collection route that bypasses §9.2 entirely',
    firesOn: 'hereby agree to indemnify, protect, and keep harmless Buyer and any third-party servicers',
  },
  {
    pattern: /Guarantor(?:\(s\))?(?: and [^.]{0,40})? shall be liable/i,
    why: 'a guarantor made liable for a cost is a guarantor made liable, whatever the sum is called',
    firesOn:
      'Merchant and Guarantor shall be liable for, and Buyer may charge and collect, the reasonable costs and expenses',
  },
  {
    pattern: /binding Merchant and Guarantor to comply/i,
    why: 'binding a guarantor to comply with the whole Agreement is the market guaranty §9.2 refuses',
    firesOn:
      'legally binding Merchant and Guarantor to comply with the terms of this Agreement and that the information provided herein',
  },
];

/**
 * Clauses that still offend and belong to another cluster.
 *
 * NAMED WITH AN OWNER AND A REASON, never silently skipped. A concession with
 * no owner is how a defect becomes a permanent feature.
 *
 * **When the owning cluster fixes one, delete its line here.** That deletion is
 * the intended maintenance of this file and is not "editing a test to make it
 * pass" — the entry exists to record that this cluster looked at the clause,
 * could not edit it, and left it open.
 *
 * They are NOT pinned as still-offending. `representations-are-present-fact`
 * made the same call and gave the reason: an assertion about another cluster's
 * uncommitted draft turns this file into a tripwire on their work, and
 * `enrollment.ts` is being rewritten in this checkout right now. The
 * anti-vacuity guard below carries the weight instead, and it does not depend
 * on any other agent's file.
 */
const CONCEDED: Record<string, string> = {
  /*
    FOUND BY THIS ASSERTION, AND BY NOTHING ELSE. §7.21 is in the
    `data-and-channel` brief as an ISO clause; no brief names it as a guaranty
    problem, and the 2026-09-09 memo does not raise it under Section 9.

    It makes "Each Merchant and Guarantor" indemnify Buyer and its officers,
    directors, members, shareholders, employees and agents against ALL losses
    "resulting from any act or omission by any ISO" — a human being personally
    liable, without limit, for the conduct of a BROKER they did not choose,
    cannot control and whose agreement with Buyer they have never seen. It is
    the widest guarantor liability left in the document, wider than the §7.9 it
    was hiding behind, and it is the third route around §9.2 rather than the
    second. Handed to `data-and-channel` and to the brief-writer.
  */
  'frpa.independent-sales-organizations-and-brokers-7-21':
    'DATA-AND-CHANNEL. "Each Merchant and Guarantor agrees to indemnify and hold harmless Buyer ... from and ' +
    'against all losses, damages, claims, liabilities, and expenses ... resulting from any act or omission by any ' +
    'ISO" — unlimited personal liability for a third party’s conduct, outside Section 9 and unmentioned by any brief.',
  'frpa.security-interest-4-10':
    'ENROLLMENT. "Merchant and Guarantor shall be liable for" the costs of perfecting Buyer’s security interest — ' +
    'personal liability for a cost, granted outside Section 9 and reachable without proving any conduct.',
  'frpa.execution':
    'MISCELLANEOUS. "legally binding Merchant and Guarantor to comply with the terms of this Agreement" is a ' +
    'full-performance guaranty in the signature block, and its second sentence makes any misrepresentation ' +
    '"a separate cause of action for fraud" — a route around §9.2’s proof requirements.',
};

describe('no clause outside Section 9 creates personal liability', () => {
  /**
   * The set-level assertion, and the one the cluster exists for.
   *
   * Stated over every FRPA clause rather than over the ten, because the defect
   * was never in a clause — it was in the conjunction, and a per-clause
   * assertion would have passed on all five members of it.
   */
  it('puts every guarantor-liability sentence inside the Guaranty, or names who owns the one it could not move', () => {
    const offenders = clauses
      .filter((entry) => entry.section !== 'guaranty')
      .filter((entry) => PERSONAL_LIABILITY.some(({ pattern }) => pattern.test(entry.body)))
      .map((entry) => entry.slug)
      .filter((slug) => CONCEDED[slug] === undefined)
      .sort();

    expect(offenders).toEqual([]);
  });

  /**
   * The anti-vacuity guard. Every detector fires on the v4 sentence it was
   * written to catch, so a green above is a statement about the corpus rather
   * than about a regex that can never match anything.
   */
  it.each(PERSONAL_LIABILITY)('the detector for "$why" can actually fire', ({ pattern, firesOn }) => {
    expect(pattern.test(firesOn)).toBe(true);
  });

  it('concedes only clauses that exist and belong to another cluster', () => {
    for (const slug of Object.keys(CONCEDED)) {
      expect(clause(slug).instrument).toBe('frpa');
      expect(MINE).not.toContain(slug);
      expect(CONCEDED[slug]?.length ?? 0).toBeGreaterThan(40);
    }
  });
});

/**
 * Half two. The five routes, closed together or not closed at all.
 *
 * `open` is written as the question a funder's counsel would ask in a dispute:
 * *can I still get to the human this way?* Each returns true against v4 today.
 */
const ROUTES: { slug: string; route: string; open: (text: string) => boolean }[] = [
  {
    slug: INDEMNITY,
    route: '§7.9 indemnity reaches the guarantor for every default and every servicer claim',
    open: (text) => /Guarantor/i.test(text) && !/creates no independent Guarantor liability/i.test(text),
  },
  {
    slug: WAIVERS,
    route: '§9.4 reinstates the guaranty for anything Buyer returns in a bankruptcy clawback',
    open: (text) => !/does not enlarge or reinstate/i.test(text),
  },
  {
    slug: TITLE,
    route: '§5.11 warrants title absolutely, and §9.2(b) makes the warranty personal',
    open: (text) => !/knowledge after reasonable inquiry/i.test(text),
  },
  {
    slug: OTHER_CONTRACTS,
    route: '§5.13 warrants judicial conclusions a merchant cannot know',
    open: (text) => !/does not make a legal warranty/i.test(text),
  },
  {
    slug: LEAD_IN,
    route: 'the §5 lead-in makes every present-fact statement a continuing promise',
    open: (text) => !/expressly stated as a continuing covenant/i.test(text),
  },
];

describe('the five clauses that gave the limited guaranty back', () => {
  it('is exactly five, all of them this cluster’s', () => {
    expect(ROUTES).toHaveLength(5);

    for (const { slug } of ROUTES) {
      expect(MINE).toContain(slug);
    }
  });

  /**
   * ONE ASSERTION, FIVE MEMBERS, DELIBERATELY. Closing four of the five leaves
   * the guaranty exactly as wide as it was — the leak moves, it does not shrink
   * — so the failure message has to name all of them at once.
   */
  it('closes every one of them', () => {
    const stillOpen = ROUTES.filter(({ slug, open }) => open(body(slug))).map(({ route }) => route);

    expect(stillOpen).toEqual([]);
  });
});

describe('the guaranty reaches only the guarantor’s own proved conduct', () => {
  it('names the conduct, and requires it to be the guarantor’s own', () => {
    const text = body(GUARANTY);

    expect(text).toMatch(/personally committed or knowingly directed/);
    expect(text).toMatch(/Buyer bears the burden/);
    expect(text).toMatch(/causation/);
  });

  /**
   * §9.2(b) is the limb that made this cluster necessary: liability for any
   * materially inaccurate present-fact representation, unqualified by
   * knowledge, running through §§5.11 and 5.13 to facts nobody can know.
   */
  it('drops the bare inaccurate-representation limb', () => {
    const text = body(GUARANTY);

    expect(text).not.toMatch(/no representation or warranty of present fact/);
    expect(text).toMatch(/inaccurate representation alone does not establish fraud/i);
  });

  /**
   * The best thing in v4, and it survives. The express exclusions are what the
   * funder publishes as commitment #3.
   */
  it.each([
    ['insufficient receipts', /[Ii]nsufficient receipts/],
    ['a good-faith closure', /good-faith closure/],
    ['insolvency', /insolvency/],
    ['bankruptcy', /bankruptcy/],
    ['avoidance or clawback', /avoidance or clawback/],
    ['a default under another agreement', /default under another agreement/],
  ])('says %s creates no liability', (_label, pattern) => {
    expect(body(GUARANTY)).toMatch(pattern);
  });

  it('shuts the door on every other clause', () => {
    expect(body(GUARANTY)).toMatch(/No other clause or incorporated document expands this Guaranty/);
  });

  /**
   * A guaranty limited to the guarantor's own conduct cannot make one signer
   * answer for another's unrelated act, and joint-and-several language cannot
   * bind somebody who never signed.
   */
  it('§9.5 keeps joint liability only for the same loss', () => {
    const text = body(JOINT);

    expect(text).toMatch(/determined separately/);
    expect(text).toMatch(/only once/);
    expect(text).toMatch(/merely because another Guarantor/);
  });

  it('§9.6 ties the acknowledgement to the limited guaranty and stops implying counsel was consulted', () => {
    const text = body(ACKNOWLEDGEMENT);

    expect(text).toContain('Section 9.2');
    expect(text).toMatch(/may choose not to consult/);
    expect(text).toMatch(/does not expand liability/);
    expect(text).not.toMatch(/seriousness of the provisions/);
  });
});

/**
 * Two references that point at text this session deleted.
 *
 * A dead cross-reference in a guaranty is not cosmetic. §9.2(c) pointed at
 * §6.1.8; Section 6 was rewritten from fifteen limbs into three lettered ones,
 * so the limb the guaranty reaches for no longer exists and the clause is
 * unenforceable in exactly the place it is meant to bite.
 */
describe('the guaranty cites clauses that exist', () => {
  it('repoints §9.2 at §6.1(b), the intentional-diversion limb', () => {
    const text = body(GUARANTY);

    expect(text).not.toContain('Section 6.1.8');
    expect(text).toContain('Section 6.1(b)');
  });

  /**
   * §5.17 keeps its number on purpose. The representations cluster kept a
   * describable intentional-diversion covenant there BECAUSE §9.2(c) reaches it
   * that way, and `representations-are-present-fact` asserts the citation from
   * its side. Orphaning it would drop the one limb of the guaranty the funder's
   * published commitment #3 expressly keeps.
   */
  it('keeps §9.2’s citation of §5.17 by number', () => {
    expect(body(GUARANTY)).toContain('Section 5.17');
  });

  /**
   * §6.3.1 now supplies no rate and says in terms that a demand creates no
   * right to interest. §7.9's *"at the rate set forth in Section 6.3.1, from
   * the date of demand"* therefore charged interest at a rate that does not
   * exist, inside a document that denies charging interest at all.
   */
  it('stops §7.9 charging interest at a rate the document deleted', () => {
    const dead = clauses.filter((entry) => entry.body.includes('at the rate set forth in Section 6.3.1'));

    expect(dead.map((entry) => entry.slug)).toEqual([]);
  });
});

describe('the indemnity is a third-party indemnity', () => {
  it('covers third-party claims caused by specified misconduct, and nothing else', () => {
    const text = body(INDEMNITY);

    expect(text).toMatch(/third-party claim/);
    expect(text).toMatch(/finally determined by a court/);
    expect(text).toMatch(/fraud or intentional diversion/);
  });

  it('leaves first-party collection in Section 6', () => {
    const text = body(INDEMNITY);

    expect(text).toContain('Section 6.2');
    expect(text).toContain('Section 6.3');
    expect(text).toMatch(/creates no independent Guarantor liability/);
  });

  it('excludes Buyer’s own conduct and the ordinary failure of receipts to arise', () => {
    const text = body(INDEMNITY);

    expect(text).toMatch(/negligence/);
    expect(text).toMatch(/willful misconduct/);
    expect(text).toMatch(/ordinary failure of future receipts to arise/);
  });
});

describe('the representations stop warranting the unknowable', () => {
  it('§5.11 becomes disclosure and reasonable inquiry, with Buyer owning priority diligence', () => {
    const text = body(TITLE);

    expect(text).not.toMatch(/good, complete, and marketable title/);
    expect(text).not.toMatch(/free and clear of any and all/);
    expect(text).toMatch(/disclosed to Buyer all known prior assignments/);
    expect(text).toMatch(/does not warrant the absence of unknown statutory interests/);
    expect(text).toMatch(/Buyer shall independently verify priority/);
    expect(text).toContain('Section 9.2');
  });

  it('§5.13 becomes disclosure of known restrictions, and preserves bankruptcy defences', () => {
    const text = body(OTHER_CONTRACTS);

    expect(text).not.toMatch(/equitable subordination/);
    expect(text).not.toMatch(/void or voidable/);
    expect(text).toMatch(/known contractual restriction/);
    expect(text).toMatch(/does not make a legal warranty/);
    expect(text).toMatch(/creates? an Event of Default or liability under the Guaranty/);
  });

  /**
   * The lead-in is the clause that decides whether the other seventeen are
   * representations at all. `representations-are-present-fact` gives each of
   * its fourteen its own temporal anchor precisely so that cluster does not
   * depend on this fix; this is the fix.
   */
  it('the §5 lead-in separates funding-date facts from express covenants', () => {
    const text = body(LEAD_IN);

    expect(text).not.toMatch(/during the term of this Agreement/);
    expect(text).toMatch(/existing fact/);
    expect(text).toMatch(/Effective Date/);
    expect(text).toMatch(/Purchase Date/);
    expect(text).toMatch(/not a promise of future financial condition/);
    expect(text).toMatch(/expressly stated as a continuing covenant/);
  });
});

describe('the duplicated service waivers stop being a second rule', () => {
  /**
   * §10.1 already waives personal service for a party, and §10.3 already takes
   * a designated address. §10.2 and §10.4 said the same things again for a
   * Guarantor, in their own words, which is two rules that can drift apart.
   *
   * THE MEMO SAYS DELETE AND THE LIBRARY CANNOT. `library.test.ts` pins 200
   * clauses and `frpa-coverage` pins the FRPA's 97; removing a record edits
   * both, which this cluster may not do. What it can do is stop the clause
   * being a second rule: it becomes a pointer that adds nothing.
   */
  it('§10.2 points at §10.1 instead of restating it', () => {
    const text = body(SERVICE_WAIVER);

    expect(text).not.toMatch(/irrevocably and unconditionally waives/);
    expect(text).toContain('Section 10.1');
    expect(text).toMatch(/no separate waiver/);
  });

  it('§10.4 sends guarantor contact data to §9.1 and keeps its widgets', () => {
    const text = body(SERVICE_ADDRESS);

    expect(text).not.toMatch(/HEREBY AGREES TO ACCEPT SERVICE/);
    expect(text).toContain('Section 9.1');
    // The AcroForm anchors the Lombard pipeline injects. README rule 2 keeps
    // them even where the surrounding words are rewritten.
    expect(text).toContain('«50»');
    expect(text).toContain('«51»');
  });
});

/**
 * The guaranty is an interview question, not a fixed clause.
 *
 * `guarantyScope` has existed on `McaFacts` with nothing reading it, which
 * means a funder could answer `none` and still be handed a personal guaranty —
 * a hardcode wearing a fact's clothes. These gates are what make the answer do
 * something.
 */
describe('the guaranty is selected by the funder’s answer', () => {
  const scope = (guarantyScope: McaFacts['guarantyScope']): McaFacts => ({ ...LOMBARD_FACTS, guarantyScope });

  it.each([
    GUARANTY,
    WAIVERS,
    JOINT,
    ACKNOWLEDGEMENT,
  ])('%s exists only for the limited-conduct guaranty it is written for', (slug) => {
    const gate = clause(slug).includeWhen;

    expect(gate).not.toBeNull();
    expect(gate?.(scope('limited-conduct'))).toBe(true);
    expect(gate?.(scope('none'))).toBe(false);
    expect(gate?.(scope('full-performance'))).toBe(false);
  });

  it.each([SERVICE_WAIVER, SERVICE_ADDRESS])('%s exists wherever a guaranty does', (slug) => {
    const gate = clause(slug).includeWhen;

    expect(gate).not.toBeNull();
    expect(gate?.(scope('limited-conduct'))).toBe(true);
    expect(gate?.(scope('full-performance'))).toBe(true);
    expect(gate?.(scope('none'))).toBe(false);
  });

  /**
   * The indemnity and the three representations are NOT gated. They are an
   * indemnity and representations; a funder who takes no guaranty still needs
   * all four. The fix there was that they stop reaching a guarantor, not that
   * they appear conditionally.
   */
  it.each([INDEMNITY, TITLE, OTHER_CONTRACTS, LEAD_IN])('%s is in every document', (slug) => {
    expect(clause(slug).includeWhen).toBeNull();
  });

  /**
   * The invariant every gate in this package is checked against: Lombard's
   * answers select the whole FRPA. Verified here rather than assumed, because a
   * gate written against what the memo RECOMMENDS instead of what the funder
   * BUYS is the failure this catches.
   */
  it('still gives the funder whose paper this is every clause of it', () => {
    const { selected, excluded } = selectClauses({ facts: LOMBARD_FACTS, instrument: 'frpa' });

    expect(LOMBARD_FACTS.guarantyScope).toBe('limited-conduct');
    expect(excluded).toHaveLength(0);
    expect(selected).toHaveLength(clauses.length);
  });

  /**
   * And the converse, which is what makes the fact worth having: answering
   * `none` produces a document with no guaranty in it.
   */
  it('gives a funder who takes no guaranty no guaranty clauses', () => {
    const { selected } = selectClauses({ facts: scope('none'), instrument: 'frpa' });
    const survivors = selected.filter((entry) => MINE.includes(entry.slug)).map((entry) => entry.slug);

    expect(survivors.sort()).toEqual([INDEMNITY, LEAD_IN, OTHER_CONTRACTS, TITLE].sort());
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
   * The standing brief: authority goes in the code comment, marked UNVERIFIED,
   * never in a clause body. Nobody on this project has pulled Richmond Capital,
   * Apollo Funding, NewCo, LG Funding, Principis or Grafton from an official
   * reporter.
   */
  it.each(MINE)('%s cites no case in its body', (slug) => {
    expect(body(slug)).not.toMatch(/\bAD3d\b|\bNY3d\b|Richmond Capital|Apollo Funding|LG Funding|Principis|Grafton/);
  });
});
