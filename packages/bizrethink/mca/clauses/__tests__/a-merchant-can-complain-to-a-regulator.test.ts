import { describe, expect, it } from 'vitest';

import { ALL_MCA_CLAUSES, libraryFor } from '../library';

/**
 * A SIGNER CAN TALK TO A REGULATOR WITHOUT ASKING THE FUNDER FIRST, OR THIS
 * FAILS.
 *
 * §4.8 is one of the two clauses that fell through the nine cluster briefs. It
 * carries two REVIEW-02 findings and the 2026-09-09 counsel memo REFUTES the
 * more alarming of them, so the first job of this file is to state the property
 * the refutation leaves standing rather than the one the register asserts.
 *
 * WHAT THE REGISTER SAYS, AND WHAT THE DOCUMENT SAYS.
 * `frpa-4-8-may-impede-a-merchant-complaint-to-a-regulator` reads: *"4.8 permits
 * disclosure of the financing agreement only where 'required by law or court
 * order' or to a bound Advisor. A merchant who wants to complain voluntarily to
 * the DFPI ... is not disclosing under compulsion and is on the face of the
 * clause in breach - and under 6.1.1 that is an Event of Default."*
 *
 * **Both halves of that are now stale, and both were checked against primary
 * copies rather than inferred.**
 *
 *   - `sources/Lombard_FRPA_v4.docx` — the real `.docx`, unzipped and read, not
 *     the vendored `.txt` alone — carries a fourth sentence the finding does not
 *     quote: *"Notwithstanding that proviso, Merchant may disclose Confidential
 *     Information to its attorney, accountant or other professional adviser ...
 *     without that adviser giving any undertaking to Buyer, and may disclose
 *     Confidential Information to any governmental or regulatory authority."*
 *     It is an owner edit made after REVIEW-02 ran, which is why the sibling
 *     finding `frpa-4-8-conditions-the-counsel-review-7-22-promises` is recorded
 *     `implemented` while this one is recorded `open`.
 *   - §6.1.1 no longer exists. `default-remedies` replaced fifteen enumerated
 *     defaults with three lettered limbs of misconduct and added *"Merchant's
 *     covenants in this Agreement ... remain covenants, and a breach of one is
 *     an Event of Default only where it is conduct described in (a), (b) or (c)
 *     above."* A disclosure cannot be an Event of Default under any numbering.
 *
 * SO THE MEMO IS RIGHT THAT THE CURRENT TEXT DOES NOT BAN A REGULATOR COMPLAINT,
 * AND THE CLAUSE IS STILL DEFECTIVE. Three things survive the refutation and
 * each has an assertion below:
 *
 *   1. **The clause contradicts itself in two consecutive sentences.** Sentence
 *      two forbids disclosure to anyone but an Advisor who *"first agrees in
 *      writing to be bound"*; sentence three says notwithstanding that proviso,
 *      no undertaking is needed. A merchant reads the prohibition first. The
 *      §7.22 finding was closed by ADDING the contradiction rather than removing
 *      the condition, which is the shape of defect §4.7's *"only"* already cost
 *      this document once.
 *   2. **The permission is narrower than the people who need it.** v4 names a
 *      governmental or regulatory authority and stops: no law enforcement, no
 *      testimony that is not under a court order, no owner or employee outside
 *      the closed Advisor list, and no prospective financing source — which
 *      matters because §4.15 and §5.16 contemplate a merchant shopping a
 *      concurrent position, and a merchant cannot shop one without showing the
 *      agreement.
 *   3. **It runs one way.** Only Buyer's information is protected and only
 *      Merchant is bound.
 *
 * THE PROPERTY IS STATED OVER THE SET because the corpus holds four
 * confidentiality-shaped duties in three instruments and the defect is not
 * visible in any one of them: §4.7 restricts Buyer, §4.8 restricts Merchant,
 * `iso-pra.confidentiality` restricts a broker, and `permission-to-release`
 * releases an information source. Reading §4.8 alone finds a clause with a
 * carve-out and stops. Reading the set finds the one clause in this library
 * that still bars a signer from speaking to anybody without the funder's prior
 * written consent, and it is not this one.
 *
 * WHAT IT DOES NOT PROVE. That any of this is lawful. No anti-gag or
 * whistleblower provision of any state's commercial-financing law is vendored
 * in `mca/sources/`, nobody on this project has read one, and no assertion below
 * is about anything but our own words.
 */
const frpa = libraryFor('frpa');

const clause = (slug: string) => {
  const found = ALL_MCA_CLAUSES.find((entry) => entry.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not in the MCA library`);
  }

  return found;
};

const body = (slug: string) => clause(slug).body;

const CONFIDENTIALITY = 'frpa.confidentiality-4-8';
const PROTECTION = 'frpa.protection-of-information-4-7';
const COUNSEL = 'frpa.attorney-review-7-22';
const SURVIVAL = 'frpa.survival-of-representations-7-6';
const DEFAULTS = 'frpa.events-of-default-6-1';

/** The one clause this half of the cluster owns. */
const MINE = [CONFIDENTIALITY];

describe('the cluster knows which clause it is', () => {
  it('owns §4.8 and nothing else in this file', () => {
    expect(MINE).toHaveLength(1);
    expect(clause(CONFIDENTIALITY).instrument).toBe('frpa');
    expect(clause(CONFIDENTIALITY).number).toBe('4.8');
  });
});

/**
 * Half one, over the SET. A permission that carries a condition is not a
 * permission.
 *
 * Each detector carries the sentence it was written against and the block below
 * proves it fires on it. The lesson is this package's own: two assertions
 * filtered on `Divergence` kinds that do not exist and passed green for a day.
 */
const CONDITIONED_PERMISSION: { pattern: RegExp; why: string; firesOn: string }[] = [
  {
    pattern: /first agrees in writing to be bound/i,
    why: 'an adviser who must sign the funder’s terms before reading the contract is an adviser who is not consulted',
    firesOn:
      'provided such Advisor uses such information solely for advising Merchant and first agrees in writing to be bound by the terms of this Section',
  },
  {
    pattern: /to any person other than/i,
    why: 'a closed list of permitted recipients makes every unlisted recipient — a regulator, an owner, a new funder — a breach',
    firesOn: 'Merchant shall not disclose Confidential Information to any person other than Merchant’s attorney',
  },
  {
    pattern: /uses such information solely for advising/i,
    why: 'a purpose limit imposed on the merchant’s own lawyer is a limit on the advice',
    firesOn: 'provided such Advisor uses such information solely for advising Merchant',
  },
  {
    pattern: /without (?:the )?prior written consent (?:from|of) (?:Company|Buyer)/i,
    why: 'asking the counterparty’s permission before speaking is the permission a complaint cannot require',
    firesOn:
      'ISO Partner shall not disclose such information to any third party without prior written consent from Company',
  },
];

/**
 * Clauses that still offend and belong to somebody else.
 *
 * NAMED WITH AN OWNER AND A REASON, following `personal-liability-is-section-9-
 * only.test.ts`. **When the owner fixes one, delete its line here** — a
 * concession left standing after the defect is gone is a line that can no
 * longer be red.
 */
const CONCEDED: Record<string, string> = {
  'iso-pra.confidentiality':
    'ISO PARTNER REFERRAL AGREEMENT, UNOWNED. "ISO Partner shall not disclose such information to any third ' +
    'party without prior written consent from Company", with no carve-out of any kind — not for a regulator, ' +
    'not for a court, not for the broker’s own lawyer. It is a wider version of the defect the memo refutes ' +
    'here, on the signer a state regulator is most likely to want to hear from, and the 2026-09-09 memo covers ' +
    'the FRPA only. Handed back rather than fixed: the ISO PRA is outside this cluster’s two files.',
};

describe('no clause makes a signer buy permission to speak', () => {
  /**
   * The set-level assertion, over every instrument rather than over the FRPA,
   * because the worst instance of the defect is in a different document from
   * the one the memo reviewed.
   */
  it('conditions no permitted disclosure, or names who owns the one it could not move', () => {
    const offenders = ALL_MCA_CLAUSES.filter((entry) =>
      CONDITIONED_PERMISSION.some(({ pattern }) => pattern.test(entry.body)),
    )
      .map((entry) => entry.slug)
      .filter((slug) => CONCEDED[slug] === undefined)
      .sort();

    expect(offenders).toEqual([]);
  });

  it.each(CONDITIONED_PERMISSION)('the detector for "$why" can actually fire', ({ pattern, firesOn }) => {
    expect(pattern.test(firesOn)).toBe(true);
  });

  it('concedes only clauses that exist and belong to somebody else', () => {
    for (const slug of Object.keys(CONCEDED)) {
      expect(clause(slug).instrument).not.toBe('frpa');
      expect(CONCEDED[slug]?.length ?? 0).toBeGreaterThan(40);
    }
  });
});

/**
 * Half two, also over the SET, and DELIBERATELY GREEN TODAY.
 *
 * Every confidentiality duty in the corpus has to name an authority the bound
 * party may go to without asking. §4.8 satisfies this before the rewrite — that
 * is the memo's refutation, asserted rather than asserted about — and it is kept
 * because it names something that must SURVIVE the rewrite. It can go red: drop
 * the carve-out while simplifying and it fires.
 */
const CONFIDENTIALITY_DUTY = /shall not disclose|keep confidential|nonpublic business information/i;
const AUTHORITY_CARVE_OUT = /(?:governmental|regulatory|law[- ]enforcement)[^.]{0,80}authorit/i;

describe('every confidentiality duty names an authority the bound party may go to', () => {
  it('leaves nobody gagged, except the conceded one', () => {
    const gagged = ALL_MCA_CLAUSES.filter(
      (entry) => CONFIDENTIALITY_DUTY.test(entry.body) && !AUTHORITY_CARVE_OUT.test(entry.body),
    )
      .map((entry) => entry.slug)
      .filter((slug) => CONCEDED[slug] === undefined)
      .sort();

    expect(gagged).toEqual([]);
  });

  it('the duty detector and the carve-out detector both fire on the v4 sentence', () => {
    const v4 =
      'Unless disclosure is required by law or court order, Merchant shall not disclose Confidential Information ' +
      'to any person other than Merchant’s attorney ... and may disclose Confidential Information to any ' +
      'governmental or regulatory authority.';

    expect(CONFIDENTIALITY_DUTY.test(v4)).toBe(true);
    expect(AUTHORITY_CARVE_OUT.test(v4)).toBe(true);
    expect(AUTHORITY_CARVE_OUT.test('ISO Partner agrees to keep confidential all proprietary information')).toBe(false);
  });
});

/**
 * Half three, and the other half of the register finding: a disclosure cannot be
 * punished if nothing makes it a default.
 *
 * ALSO DELIBERATELY GREEN, and it is `default-remedies`' work asserted from the
 * clause that depends on it. The finding's own reasoning was *"under 6.1.1 that
 * is an Event of Default"*; if a later rewrite of §6.1 ever restores a
 * breach-any-covenant limb, the regulator complaint becomes a default again and
 * this is the file that should say so.
 */
describe('a disclosure is not an Event of Default', () => {
  it('§6.1 is closed and says so', () => {
    expect(body(DEFAULTS)).toContain('Nothing else is an Event of Default');
    expect(body(DEFAULTS)).toMatch(/remain covenants, and a breach of one is an Event of Default only where/);
  });

  it('no limb of §6.1 turns on a disclosure', () => {
    expect(body(DEFAULTS)).not.toMatch(/violate any term or covenant/i);
    expect(body(DEFAULTS)).not.toMatch(/(?:Event of Default[^.]{0,200})?disclos[^.]{0,60}(?:Confidential|regulator)/i);
  });

  it('the breach-any-covenant detector fires on the limb v4 actually had', () => {
    expect(
      /violate any term or covenant/i.test('6.1.1  Merchant shall violate any term or covenant in this Agreement;'),
    ).toBe(true);
  });
});

/**
 * Half four. What §4.8 has to say once the contradiction is taken out.
 *
 * Every assertion here is red before the rewrite: the clause is untouched v4.
 */
describe('§4.8 protects the complaint, the adviser and the testimony', () => {
  it('is mutual rather than a duty Merchant owes alone', () => {
    const text = body(CONFIDENTIALITY);

    expect(text).toMatch(/Each party shall use reasonable care/);
    expect(text).not.toMatch(/are proprietary and confidential information of Buyer/);
  });

  it('drops the Advisor mechanics rather than overriding them', () => {
    const text = body(CONFIDENTIALITY);

    expect(text).not.toMatch(/first agrees in writing to be bound/i);
    expect(text).not.toMatch(/Notwithstanding that proviso/i);
    expect(text).not.toMatch(/each, an “Advisor”/i);
  });

  it('names every recipient the memo names, including the two v4 omits', () => {
    const text = body(CONFIDENTIALITY);

    expect(text).toMatch(/lawyers, accountants, financial advisers, employees and owners/);
    expect(text).toMatch(/legitimate need to know/);
    expect(text).toMatch(/prospective financing source/i);
    expect(text).toMatch(/law[- ]enforcement/i);
  });

  it('requires no permission and no warning before a complaint', () => {
    const text = body(CONFIDENTIALITY);

    expect(text).toMatch(/No consent[^.]*and no advance notice[^.]*is required/i);
    expect(text).toMatch(/complaint/i);
    expect(text).toMatch(/testimony/i);
    expect(text).toMatch(/cooperation with an authority/i);
  });

  /**
   * v4's carve-out is *"public other than through a breach of this Section"*.
   * The memo's is *"lawfully public or independently obtained"*, which reads on
   * its face as though a party could publish in breach and then argue the
   * information had stopped being confidential. Both limbs are kept.
   */
  it('keeps the anti-self-help limb of the public-information carve-out', () => {
    const text = body(CONFIDENTIALITY);

    expect(text).toMatch(/without a breach of this Section/);
    expect(text).toMatch(/independently/);
  });

  /**
   * The duration has to survive COMPLETION, not only termination: §7.6 lists
   * *"the confidentiality duties in Section 4.8"* among the provisions that
   * survive completion under §2.6. The memo's replacement says "after
   * termination" alone, which leaves a completed agreement with no clock.
   */
  it('runs its clock from completion as well as termination', () => {
    const text = body(CONFIDENTIALITY);

    expect(text).toContain('Section 2.6');
    expect(text).toMatch(/three \(3\) years/);
    expect(text).toMatch(/longer (?:period|duty|duties)/i);
  });

  /**
   * §4.7 is a complete policy on Buyer's use AND disclosure of Merchant's
   * information and says in terms that it *"controls any inconsistent
   * information-sharing provision"*. A mutual reasonable-care duty here would
   * otherwise be a second, weaker standard for the same conduct.
   */
  it('does not become a second, softer rule for Buyer’s handling of merchant data', () => {
    expect(body(CONFIDENTIALITY)).toContain('Section 4.7');
    expect(body(PROTECTION)).toMatch(/controls any inconsistent information-sharing provision/);
  });

  it('coins no defined term of its own', () => {
    expect(body(CONFIDENTIALITY)).not.toContain('“Confidential Information”');
  });
});

/**
 * The cross-references two other clusters built on §4.8, asserted from this side.
 *
 * `miscellaneous` added §7.22’s citation of §4.8 *"precisely so that the
 * counsel-review finding does not close in one place only"*, and
 * `a-notice-can-arrive-in-time.test.ts` asserts the citation from §7.22's side.
 * Nothing asserted that §4.8 actually delivers what §7.22 promises about it.
 */
describe('§7.22 and §7.6 still describe §4.8 correctly', () => {
  it('§7.22 keeps its citation', () => {
    expect(body(COUNSEL)).toContain('Section 4.8');
    expect(body(COUNSEL)).toMatch(
      /Section 4\.8 does not restrict a disclosure made to an attorney, an accountant or another professional adviser/,
    );
  });

  it('§4.8 delivers the unrestricted adviser disclosure §7.22 recites', () => {
    const text = body(CONFIDENTIALITY);

    expect(text).toMatch(/lawyers, accountants/);
    expect(text).not.toMatch(/only if|on condition that|subject to that adviser/i);
  });

  it('§7.6 still finds confidentiality duties here to survive', () => {
    expect(body(SURVIVAL)).toContain('the confidentiality duties in Section 4.8');
    expect(body(CONFIDENTIALITY)).toMatch(/continue|end|survive/i);
  });
});

describe('rewriting changed nothing about provenance', () => {
  it.each(MINE)('%s is still attorney-drafted with no author', (slug) => {
    expect(clause(slug).source).toEqual({ kind: 'attorney-drafted', author: null });
    expect(clause(slug).status).toBe('draft');
  });

  it('keeps both findings REVIEW-02 recorded against it', () => {
    const findings = clause(CONFIDENTIALITY).examinedBy.flatMap((entry) => entry.findings);

    expect(findings).toContain('frpa-4-8-conditions-the-counsel-review-7-22-promises');
    expect(findings).toContain('frpa-4-8-may-impede-a-merchant-complaint-to-a-regulator');
  });

  it.each(MINE)('%s names no tenant and cites no case', (slug) => {
    expect(body(slug)).not.toMatch(/Lombard|Payzli/);
    expect(body(slug)).not.toMatch(/\bAD3d\b|\bNY3d\b|Richmond Capital|Apollo Funding|LG Funding|Principis|Grafton/);
  });

  /**
   * §4.8 is ungated and stays ungated. ADR 0013's diagnostic: a gate is right
   * only where the values of a fact partition the clauses it gates, and no fact
   * on `McaFacts` decides whether a funder keeps secrets. The clause is in every
   * FRPA this library can assemble.
   */
  it('is in every document', () => {
    expect(clause(CONFIDENTIALITY).includeWhen).toBeNull();
    expect(frpa.some((entry) => entry.slug === CONFIDENTIALITY)).toBe(true);
  });
});
