// ADR 0011 adds the existing funding grid and separates the existing interest paragraph: FRPA 108, corpus 211.
// ADR 0011: citation assertions name semantic targets. Historical numbers in test titles identify the drafting regression.
import { describe, expect, it } from 'vitest';

import { selectClauses } from '../../engine/select-clauses';
import { LOMBARD_FACTS, type McaFacts } from '../facts';
import { ALL_MCA_CLAUSES, libraryFor } from '../library';

/**
 * A PERSON BECOMES A GUARANTOR BY BEING NAMED AND SIGNING AS ONE, OR THIS FAILS.
 *
 * §9.1 is the other clause that fell through the nine cluster briefs, and it is
 * the **fourth route to guarantor liability**. Three were closed on 2026-09-10:
 * §9.2's own scope, §7.21's ISO indemnity, and `frpa.execution`'s binding
 * recital. This is the same defect at the place a human actually puts a pen
 * down — a grid that collects a natural person's name, home address and Social
 * Security number under the heading of a Guaranty, and **nowhere says what makes
 * that person a Guarantor**.
 *
 * `personal-liability-is-section-9-only.test.ts` cannot see it, and that is
 * structural rather than an oversight: its set-level assertion filters
 * `entry.section !== 'guaranty'`, so anything inside Section 9 is invisible to
 * it, and §9.1 has `body: ''` so there is no text for a detector to read. **§9.1
 * is deliberately NOT added to that file's `MINE`** — `MINE` is a statement of
 * what the guaranty cluster owned, its length is asserted at ten, and widening
 * somebody else's ownership list to reach a clause they correctly left alone
 * would make their docstring false. The property is stated here instead.
 *
 * WHAT WAS VERIFIED AGAINST THE DOCUMENT, BECAUSE THE MEMO'S PREMISE IS WRONG.
 * Entry 084 says *"No substantive field block is visible in the exported clause;
 * the site's note reports a single signature widget. The actual layout must be
 * inspected."* It was inspected — `sources/Lombard_FRPA_v4.docx` unzipped and
 * read paragraph by paragraph, not the vendored `.txt` alone:
 *
 *   - **§9.1 DOES hold a substantive field block.** A two-column Field/Value
 *     table with six rows: Full Name `«35»`, Title `«36»`, Social Security
 *     Number `«37»`, Home Address `«38»`, Phone `«39»`, Email `«40»`. The
 *     library has held all six since import. The memo's first premise is FALSE,
 *     and this is the sixth memo premise this exercise has had to correct.
 *   - **The signature note is TRUE and is the real defect.** The execution grid
 *     holds exactly one guarantor block — `PERSONAL GUARANTOR`, `Guarantor
 *     Signature: {{SIGNATURE, r2}}`, `Printed Name: ________«47»________`,
 *     `Date: {{DATE, r2}}` — non-repeating, with **no capacity line**, while
 *     Buyer gets a Title at `«42»` and Merchant a Title at `«46»`. §9.5 says
 *     the obligations of *"the persons or entities constituting Guarantors"*
 *     are joint and several. The form can collect one. That is REVIEW-02's
 *     `frpa-9-5-refers-to-guarantors-the-form-cannot-collect`, already on this
 *     record.
 *
 * WHAT THIS FILE CANNOT FIX, AND STATES INSTEAD. Two things, both handed back:
 *
 *   1. **Capacity is not evidenced anywhere.** `miscellaneous` established by
 *      reading this repository that Pacta records a recipient's ROLE IN AN
 *      ENVELOPE — signer, approver, viewer, cc — and has no field for the legal
 *      capacity in which a human signed. One person commonly signs both as an
 *      officer of Merchant and personally as Guarantor. §9.1 and
 *      `frpa.execution` both turn on that distinction. Drafting cannot supply
 *      the evidence; the assertion below only pins that both clauses state the
 *      rule, so that a reader of either finds it.
 *   2. **The SSN reaches the distributed copy.** `«37»` prints in the body of
 *      the agreement, so every completed PDF — including a copy an ISO holds —
 *      carries a full Social Security number. §9.1 now states the duty; the FORM
 *      still breaks it, and no test here can close that.
 */
const clause = (slug: string) => {
  const found = ALL_MCA_CLAUSES.find((entry) => entry.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not in the MCA library`);
  }

  return found;
};

const body = (slug: string) => clause(slug).body;

const IDENTITY = 'frpa.guarantor-information-9-1';
const GUARANTY = 'frpa.guaranty-of-performance-9-2';
const JOINT = 'frpa.joint-and-several-liability-9-5';
const SERVICE_ADDRESS = 'frpa.section-10-4';
const EXECUTION = 'frpa.execution';

/** The one clause this half of the cluster owns. */
const MINE = [IDENTITY];

describe('the cluster knows which clause it is', () => {
  it('owns §9.1 and nothing else in this file', () => {
    expect(MINE).toHaveLength(1);
    expect(clause(IDENTITY).instrument).toBe('frpa');
    // ADR 0011: this operative record must remain citable after selection.
    expect(clause(IDENTITY).unnumberedReason).toBeUndefined();
    expect(clause(IDENTITY).kind).toBe('field-group');
  });
});

/**
 * The fourth route, closed. Every assertion here is red before the rewrite,
 * because `body` is the empty string.
 */
describe('§9.1 says what makes a person a Guarantor', () => {
  it('has words at all', () => {
    expect(body(IDENTITY).trim().length).toBeGreaterThan(0);
  });

  it('requires the name, the notice address and the capacity', () => {
    const text = body(IDENTITY);

    expect(text).toMatch(/full legal name/i);
    expect(text).toMatch(/address for notice/i);
    expect(text).toMatch(/capacity/i);
  });

  /**
   * THE SENTENCE THIS CLAUSE EXISTS FOR. The memo's own words, and the fourth
   * instance of the defect `personal-liability-is-section-9-only` was written
   * against.
   */
  it('says a signature for Merchant alone creates no personal liability', () => {
    expect(body(IDENTITY)).toMatch(/signature (?:given )?solely for Merchant does not create personal liability/i);
  });

  it('states the consequence of not being identified', () => {
    const text = body(IDENTITY);

    expect(text).toMatch(/is not a Guarantor/i);
    expect(text).toMatch(/no owner, spouse/i);
  });

  it('requires a separate block for each intended Guarantor', () => {
    const text = body(IDENTITY);

    expect(text).toMatch(/separate/i);
    expect(text).toMatch(/each (?:intended )?Guarantor/i);
    expect(text).toMatch(/printed name/i);
    expect(text).toMatch(/date/i);
  });

  /**
   * `avoid distributing full SSNs in contract copies` — the memo's, and the
   * reason the §9.1 gate mattered in the first place.
   */
  it('keeps the full identification number out of the distributed copy', () => {
    const text = body(IDENTITY);

    expect(text).toMatch(/secure(?:ly)?[^.]{0,60}separate/i);
    expect(text).toMatch(/truncated or masked/i);
    expect(text).not.toMatch(/last four/i);
  });

  it('cites no case and names no tenant', () => {
    expect(body(IDENTITY)).not.toMatch(/Lombard|Payzli/);
    expect(body(IDENTITY)).not.toMatch(/\bAD3d\b|\bNY3d\b|Richmond Capital|Apollo Funding|LG Funding/);
  });
});

/**
 * The set-level property, and the reason this is not a per-clause assertion.
 *
 * A person signs the FRPA in two places — the guarantor identity block in
 * Section 9 and the execution grid at the end — and a reader of one may never
 * read the other. The capacity rule has to be in BOTH, in words that agree.
 * `frpa.execution` carries it already; §9.1 did not, so the rule was stated
 * exactly once, twenty pages from the grid that collects the data it governs.
 *
 * It is over the set rather than over §9.1 because closing one of the two
 * leaves the ambiguity exactly where it was.
 */
const CAPACITY_RULE = /capacity/i;
const NOT_PERSONALLY_BOUND = /(?:no personal obligation|does not create personal liability)/i;

describe('the capacity rule is stated wherever a human signs', () => {
  it('appears in both the identity block and the execution block', () => {
    for (const slug of [IDENTITY, EXECUTION]) {
      expect(CAPACITY_RULE.test(body(slug)), `${slug} does not mention capacity`).toBe(true);
      expect(
        NOT_PERSONALLY_BOUND.test(body(slug)),
        `${slug} does not say a Merchant signature binds nobody personally`,
      ).toBe(true);
    }
  });

  /**
   * The anti-vacuity control. Both detectors fire on the v4 sentence they were
   * written against, and neither fires on a sentence that merely mentions a
   * Guarantor — otherwise a green above would be a statement about the word
   * "Guarantor" appearing somewhere.
   */
  it('the detectors fire on the v4 execution recital and not on any guarantor mention', () => {
    const v4 =
      'Each of Merchant and Guarantor represents that he or she is authorized to sign this Agreement, legally ' +
      'binding Merchant and Guarantor to comply with the terms of this Agreement';

    expect(CAPACITY_RULE.test(v4)).toBe(false);
    expect(NOT_PERSONALLY_BOUND.test(v4)).toBe(false);
    expect(
      NOT_PERSONALLY_BOUND.test('The obligations of the persons constituting Guarantors are joint and several.'),
    ).toBe(false);
  });

  /**
   * And the two clauses must not disagree about the mechanism. `frpa.execution`
   * says a person "becomes a Guarantor only by separately signing the Guaranty
   * in that capacity"; §9.1 has to say the same thing about the same act, or the
   * document answers the question twice with two answers.
   */
  it('agrees with §frpa.execution about how a person becomes a Guarantor', () => {
    expect(body(EXECUTION)).toMatch(/becomes a Guarantor only by separately signing the Guaranty in that capacity/);
    expect(body(IDENTITY)).toMatch(/separately signs the Guaranty/i);
  });
});

/**
 * §10.4 points AT this clause for a Guarantor's notice and service addresses —
 * *"The email address and the mailing address a Guarantor gives in Section 9.1
 * are that Guarantor's addresses for notice and for service of process under
 * Section 10.1."* Nothing asserted that §9.1 actually collects them, or said so
 * on its own face.
 */
describe('§10.4 and §9.5 still describe §9.1 correctly', () => {
  it('§10.4 keeps its citation and §9.1 collects what it points at', () => {
    expect(body(SERVICE_ADDRESS)).toContain('Section [[clause:frpa.guarantor-information-9-1]]');

    const labels = (clause(IDENTITY).fields ?? []).map((field) => field.label);

    expect(labels).toContain('Email');
    expect(labels).toContain('Home Address');
  });

  /**
   * §9.5 makes the Guarantors' obligations several and joint only for the same
   * loss. That is meaningless unless more than one person can be a Guarantor,
   * which is what the repeated block in §9.1 supplies.
   */
  it('§9.1 supports the plural §9.5 already assumes', () => {
    expect(body(JOINT)).toMatch(/determined separately/);
    expect(body(IDENTITY)).toMatch(/each (?:intended )?Guarantor/i);
  });
});

/**
 * The grid itself. Nothing here changed and the assertions exist to say so:
 * adding, dropping or renumbering a widget is a change to the RENDERED FORM and
 * to the Lombard AcroForm pipeline, not a drafting change this cluster may make.
 * `clauses/README.md` rule 2.
 */
describe('the form is unchanged, and that is deliberate', () => {
  it('keeps all six widgets exactly as the document prints them', () => {
    expect(clause(IDENTITY).fields).toEqual([
      { label: 'Full Name', widget: '«35»', kind: 'text', required: true },
      { label: 'Title', widget: '«36»', kind: 'text', required: false },
      { label: 'Social Security Number', widget: '«37»', kind: 'ssn', required: true },
      { label: 'Home Address', widget: '«38»', kind: 'text', required: true },
      { label: 'Phone', widget: '«39»', kind: 'text', required: true },
      { label: 'Email', widget: '«40»', kind: 'text', required: true },
    ]);
  });

  /**
   * THE OPEN CONFLICT, PINNED SO IT CANNOT BE MISTAKEN FOR CLOSED.
   *
   * §9.1's body now requires a truncated identifier in a distributed copy, and
   * the field group still collects a full SSN into the body of the agreement.
   * **The clause and the form disagree, and the form is what renders.** This
   * asserts the disagreement rather than hiding it: when the form is fixed —
   * a masked field, or collection moved off the contract entirely — this test
   * is what has to be re-read, and the assertion below is what makes somebody
   * re-read it.
   */
  it('records that the form does not yet honour what the clause requires', () => {
    const ssn = (clause(IDENTITY).fields ?? []).find((field) => field.kind === 'ssn');

    expect(ssn?.label).toBe('Social Security Number');
    expect(body(IDENTITY)).toMatch(/truncated or masked/i);
  });
});

/**
 * The gate, and the counts it must not move.
 *
 * §9.1 keeps the `guarantyScope !== 'none'` gate commit `923b97be9` gave it. ADR
 * 0013's diagnostic asks whether the values of a fact partition the clauses it
 * gates; here they do, and the gate is not this cluster's to revisit.
 */
describe('the gate and the provenance are unchanged', () => {
  const scope = (guarantyScope: McaFacts['guarantyScope']): McaFacts => ({ ...LOMBARD_FACTS, guarantyScope });

  it('exists wherever a guaranty does and nowhere else', () => {
    const gate = clause(IDENTITY).includeWhen;

    expect(gate).not.toBeNull();
    expect(gate?.(scope('limited-conduct'))).toBe(true);
    expect(gate?.(scope('full-performance'))).toBe(true);
    expect(gate?.(scope('none'))).toBe(false);
  });

  it('collects no guarantor data for a funder that takes no guaranty', () => {
    const { selected } = selectClauses({ facts: scope('none'), instrument: 'frpa' });

    expect(selected.map((entry) => entry.slug)).not.toContain(IDENTITY);
  });

  it('is still attorney-drafted with no author and keeps both findings', () => {
    expect(clause(IDENTITY).source).toEqual({ kind: 'attorney-drafted', author: null });
    expect(clause(IDENTITY).status).toBe('draft');

    const findings = clause(IDENTITY).examinedBy.flatMap((entry) => entry.findings);

    expect(findings).toContain('frpa-guarantor-widget-bound-to-merchant');
    expect(findings).toContain('frpa-9-5-refers-to-guarantors-the-form-cannot-collect');
  });

  /**
   * Giving a field group a body does not turn it into a clause, and must not
   * move the pinned record counts. `frpa-coverage`, `library` and `surface` pin
   * these counts too; the alternative — splitting §9.1 into a prose record and a
   * grid record — would have added a record for a section the document numbers
   * once. Asserted here so the choice is visible where it was made.
   *
   * **The numbers moved on 2026-09-11 and this clause is not why**, which is
   * the assertion still doing its job: 100 → 105 and 203 → 208 for the four
   * `full-performance` guaranty records and `frpa.arbitration-7-26`, then 105 →
   * 106 and 208 → 209 for the full-recourse §6.1 the next day. §9.1 is still one
   * record and still the only §9.1.
   *
   * **This is the fourth pinned count and the easiest to miss** — it is in a
   * file about the execution grid, not about counting — so it is named in both
   * of the last two changes rather than found again each time.
   */
  it('adds no record to the library', () => {
    expect(libraryFor('frpa')).toHaveLength(108);
    expect(ALL_MCA_CLAUSES).toHaveLength(211);
    expect(ALL_MCA_CLAUSES.filter((entry) => entry.slug === IDENTITY && entry.instrument === 'frpa')).toHaveLength(1);
  });

  /**
   * And §9.2 is still the only guaranty. §9.1 states an identification rule; it
   * must not accidentally become a second place that says what a Guarantor is
   * liable FOR.
   */
  it('creates no liability of its own', () => {
    const text = body(IDENTITY);

    expect(text).not.toMatch(/jointly and severally/i);
    expect(text).not.toMatch(/shall assume liability/i);
    expect(text).not.toMatch(/agrees? to indemnify/i);
    expect(body(GUARANTY)).toMatch(/No other clause or incorporated document expands this Guaranty/);
  });
});
