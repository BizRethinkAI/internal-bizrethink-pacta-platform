import { createHash } from 'node:crypto';

import type { ClauseSource } from '../../provenance/types';
import { JURISDICTION_NAMES, MCA_JURISDICTIONS, type McaJurisdiction } from '../jurisdictions';
import type { ReviewFinding } from './examination';
import type { McaInstrument } from './instruments';
import type { McaClause } from './types';

/**
 * Attorney sign-off on the negotiated agreements, and the one thing it does.
 *
 * WHAT AN APPROVAL IS FOR. Every clause in this library is `attorney-drafted`
 * with a null author, and `assertPublishable` refuses exactly that
 * ([ADR 0008](../../../../docs/adr/0008-mca-is-two-surfaces-not-one.md)). An
 * approval is how the author gets named. It is NOT a second gate beside
 * `assertPublishable` and must never become one: `approvedMcaClause` hands the
 * existing gate a clause whose `source.author` is filled in, and the gate then
 * says what it always said. If the provenance rules change, this changes with
 * them for free, which is the whole reason for going through the gate rather
 * than around it.
 *
 * THE INVERSION AND ITS ONE DANGER, inherited verbatim from the lease library
 * because the danger is identical. The library is TypeScript, so a reviewing
 * attorney cannot edit it. Approval therefore lives in the database and
 * overrides what the code says — and if an approval survived a text change,
 * editing a clause would silently inherit sign-off on words the attorney never
 * read. Nothing would be red. The clause would simply start rendering as
 * reviewed.
 *
 * So an approval is pinned to a FINGERPRINT of the clause as approved. Every
 * function here fails closed: no approval means draft, a lapsed approval means
 * draft, an unattributed approval means draft.
 */

export type McaClauseApproval = {
  clauseSlug: string;
  clauseVersion: number;
  /**
   * The agreement the clause was in when it was approved.
   *
   * Stored rather than derived, for the reason the lease's approval stores its
   * jurisdiction: a clause can move in a later library version, and what this
   * row records is what was true when the attorney signed off. It is also the
   * cheapest guard against the confusion this package is most exposed to — the
   * Equipment Lease and the Subscription number their clauses IDENTICALLY, and
   * an approval that named neither would be an approval of "clause 3.2".
   */
  instrument: McaInstrument;
  /** `mcaClauseFingerprint` of the clause as it stood when approved. */
  fingerprint: string;

  /**
   * WHOSE AUTHORITY, AND WHO TYPED IT. Two different people, deliberately kept
   * as two different fields.
   *
   * `approvedByName` and `approvedByBarNumber` are the attorney's. They are
   * what `approvedMcaClause` puts into `source.author`, which is the fact
   * `assertPublishable` demands. `recordedByUserId` is the staff member sitting
   * at the keyboard. Nobody signs anything here — a member of staff RECORDS an
   * approval under an attorney's name, and the two differing is the honest
   * description of what happened rather than a defect to paper over.
   */
  approvedByName: string;
  approvedByBarNumber: string | null;
  recordedByUserId: number;

  /**
   * The bar the approving attorney is admitted in.
   *
   * REQUIRED, UNLIKE THE BAR NUMBER, and the reason is the defect
   * `lease/clauses/approval-jurisdiction.ts` was written to fix: that table
   * "recorded a bar NUMBER and never which bar, so nothing could have objected
   * to a Florida attorney approving a North Carolina clause". Repeating that in
   * a brand-new model would be repeating a known defect on purpose.
   *
   * An `McaJurisdiction` — a state. That is a jurisdiction and belongs on this
   * axis. What must never arrive here is an instrument; see `instrument` above,
   * which is where that fact lives.
   */
  barJurisdiction: McaJurisdiction;

  approvedAt: Date;
  notes: string | null;
};

/**
 * What was approved, reduced to a hash.
 *
 * COVERS EVERYTHING THAT CHANGES WHAT A MERCHANT READS, OR WHICH DOCUMENT THEY
 * READ IT IN: the words, the heading above them, the number the document
 * prints, the version, the agreement it is published in, the section it is read
 * under, the statute that compels it, and the states whose law scopes it. The
 * lease library calls the last of those "the condition that decides whether the
 * clause appears at all" — an attorney approved this text FOR these
 * circumstances — and `appliesInStates` plus `instrument` are that condition
 * here, because this library has no `includeWhen` and no engine yet.
 *
 * `sortKey` IS DELIBERATELY EXCLUDED, and this is the one exclusion worth
 * arguing. It moves a clause within its section without changing a word anybody
 * agreed to. Lapsing an approval over a reordering would train a reviewer to
 * re-approve without reading, which is worse than not lapsing at all — a gate
 * everyone clicks through is not a gate.
 *
 * `source` IS EXCLUDED, and here the reason is mechanical rather than
 * philosophical: an approval FILLS IN `source.author`. Fingerprinting the
 * source would mean every approval invalidated itself the instant it was
 * applied.
 *
 * `status` and `examinedBy` are excluded too. Status is the answer this
 * mechanism computes, not an input to it. `examinedBy` is evidence ABOUT the
 * clause rather than words in it — and the honest consequence is written down
 * rather than hidden: a finding attached after an approval does not lapse it.
 * Findings hold a clause at the moment of approval (see `findingsHold`) and are
 * shown live beside every approved clause; they do not reach back. The lease
 * library has the same gap and the same reason.
 */
export const mcaClauseFingerprint = (clause: McaClause): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        slug: clause.slug,
        version: clause.version,
        instrument: clause.instrument,
        number: clause.number,
        section: clause.section,
        heading: clause.heading,
        body: clause.body,
        requiredBy: clause.requiredBy ?? null,
        appliesInStates: [...clause.appliesInStates].sort(),
      }),
    )
    .digest('hex');

/** Does this approval still describe this clause? */
export const isMcaApprovalCurrent = (clause: McaClause, approval: McaClauseApproval | null): boolean => {
  if (!approval) {
    return false;
  }

  if (approval.clauseSlug !== clause.slug) {
    return false;
  }

  /*
    Slugs are globally unique across instruments (README rule 7), so this can
    only fire when a clause has MOVED between agreements. That is exactly when
    an approval should lapse — the Equipment Lease and the Subscription number
    their clauses identically, and "approved in the other twin" is the sign-off
    this library most needs to be unable to inherit.
  */
  if (approval.instrument !== clause.instrument) {
    return false;
  }

  // An unattributed approval is the state this feature exists to leave.
  if (approval.approvedByName.trim() === '') {
    return false;
  }

  return approval.fingerprint === mcaClauseFingerprint(clause);
};

/**
 * The attorney, as `ClauseSource.author` wants them: a name and a bar number.
 *
 * The comment on that field says "Name and bar number", so this is the shape it
 * asked for. A missing bar number degrades to the name alone rather than
 * printing an empty bracket — an approval without a number is weaker evidence,
 * and it should read as weaker rather than as malformed.
 */
const namedAuthor = (approval: McaClauseApproval): string =>
  approval.approvedByBarNumber === null || approval.approvedByBarNumber.trim() === ''
    ? approval.approvedByName.trim()
    : `${approval.approvedByName.trim()} (${approval.approvedByBarNumber.trim()})`;

/**
 * The clause as it stands once an approval is applied — the ONLY thing an
 * approval does.
 *
 * Hand the result to `assertPublishable` and it answers with its own rules.
 * There is no second list of conditions here and there must never be one: a
 * parallel gate is a gate that can disagree with the first, and the one that
 * disagrees quietly is the one that ships the clause.
 *
 * `retired` always wins. Retired means superseded, and nothing should render it
 * again whatever an approval says.
 */
export const approvedMcaClause = (clause: McaClause, approval: McaClauseApproval | null): McaClause => {
  if (clause.status === 'retired') {
    return clause;
  }

  if (!isMcaApprovalCurrent(clause, approval) || approval === null) {
    return clause;
  }

  return {
    ...clause,
    source:
      clause.source.kind === 'attorney-drafted'
        ? ({ kind: 'attorney-drafted', author: namedAuthor(approval) } satisfies ClauseSource)
        : clause.source,
    status: 'published',
  };
};

/**
 * A fingerprint of one agreement's worth of clauses, for pinning a review link.
 *
 * `mcaClauseFingerprint` answers "has THIS clause changed since it was
 * approved". This answers "has ANY of it changed since the link was sent" —
 * what a reviewer opening a link days later needs, because they were sent an
 * agreement, not a clause.
 */
export const mcaLibraryFingerprint = (clauses: McaClause[]): string =>
  createHash('sha256')
    .update(
      clauses
        .map((clause) => mcaClauseFingerprint(clause))
        .sort()
        .join('\n'),
    )
    .digest('hex');

/*
  ── Which bar, and what it covers ──────────────────────────────────────────
*/

/**
 * Turn what a member of staff typed into a state this library recognises.
 *
 * They are typing on an attorney's behalf, so it arrives however they wrote it:
 * "CA", "California", "us-ca". The stored value has to equal the value in
 * `appliesInStates` exactly, or the comparison never fires and the guard is
 * decorative — the lease library's `normaliseJurisdiction` exists for that
 * reason and this is the same problem on the other vertical's vocabulary.
 *
 * DERIVED FROM `MCA_JURISDICTIONS` AND `JURISDICTION_NAMES` rather than written
 * out again. A second hand-written table of state spellings is a table that
 * drifts from the first, and the drift would be silent: an admission nobody can
 * type is an admission that never matches.
 */
const ADMISSIONS: Record<string, McaJurisdiction> = MCA_JURISDICTIONS.reduce<Record<string, McaJurisdiction>>(
  (map, jurisdiction) => {
    map[jurisdiction.toLowerCase()] = jurisdiction;
    map[jurisdiction.slice(3).toLowerCase()] = jurisdiction;
    map[JURISDICTION_NAMES[jurisdiction].toLowerCase()] = jurisdiction;

    return map;
  },
  {},
);

export const normaliseMcaAdmission = (input: string | null): McaJurisdiction | null => {
  if (input === null) {
    return null;
  }

  return ADMISSIONS[input.trim().toLowerCase()] ?? null;
};

const listOf = (states: readonly McaJurisdiction[]): string =>
  states.map((state) => JURISDICTION_NAMES[state]).join(' and ');

/**
 * The states this clause is in the document for that this admission says
 * nothing about.
 *
 * ISO PRA §2.6 is the case that makes this real: it names two states, because
 * 10 CCR §952 and 23 NYCRR §600.21 both regulate what a broker may hand a
 * recipient. An attorney admitted in California has read one of those two.
 * Reported rather than blocked — see `admissionBlocks` — because blocking would
 * make that clause unapprovable by any single attorney, and one approval row
 * carries one bar.
 */
export const statesNotCovered = (clause: McaClause, admission: McaJurisdiction | null): McaJurisdiction[] =>
  admission === null ? [...clause.appliesInStates] : clause.appliesInStates.filter((state) => state !== admission);

/**
 * Why this admission may not approve this clause, or null if it may.
 *
 * A SENTENCE, NOT A BOOLEAN, for the reason the lease library gives: the caller
 * shows it to whoever is recording the approval, and "blocked" without a reason
 * is the kind of guard people route around.
 *
 * THE PERMISSIVE READING OF AN UNSCOPED CLAUSE IS DELIBERATE AND PROVISIONAL,
 * and it is not the lease library's `generic` tier under another name. Most of
 * this corpus is our own commercial drafting, a creature of no state's statute
 * — `appliesInStates` is empty for it, and that emptiness is a positive claim
 * the clause files make, not an absence of data. Any admission is treated as
 * covering it. Counsel has been asked to confirm that; if the answer is no it
 * changes in this one function.
 */
export const admissionBlocks = (clause: McaClause, admission: McaJurisdiction | null): string | null => {
  if (admission === null) {
    return 'Record which bar the approving attorney is admitted in. An approval that does not say which bar cannot be checked against the clause it approves.';
  }

  if (clause.appliesInStates.length === 0) {
    return null;
  }

  if (clause.appliesInStates.includes(admission)) {
    return null;
  }

  return `This clause is in the agreement because of ${listOf(clause.appliesInStates)} law, and the approving attorney is admitted in ${JURISDICTION_NAMES[admission]}.`;
};

/*
  ── Findings ───────────────────────────────────────────────────────────────
*/

/**
 * Why this clause may not be approved yet, or null if it may.
 *
 * YES, AN OUTSTANDING FINDING HOLDS AN MCA CLAUSE — THE SAME ANSWER AS THE
 * LEASE LIBRARY, REACHED BY A DIFFERENT ROUTE, AND THE ROUTE IS THE PART WORTH
 * READING.
 *
 * The lease's findings are written by the reviewing attorney through the review
 * link, against text we control, and answered by staff on the library page. The
 * loop closes inside this product. Nothing here works that way. These findings
 * come from two adversarial reviews of the DOCUMENTS, they live in
 * `lombard-contracts`, and their dispositions live in that repository's
 * manifests. There is no button in Pacta that answers one.
 *
 * That difference is the strongest argument AGAINST blocking, and it was
 * considered: `lease-builder-router.ts` says, of its own scoping, that "a guard
 * that cites work the person cannot reach is a dead end they will route
 * around". The reason it loses is that the work IS reachable, just not from
 * here — recording a disposition in `REVIEW-01-manifest.json` clears the
 * finding, and the refusal below says so by name. A guard that names the file
 * is not a dead end; it is a handoff.
 *
 * The alternative — a second, Pacta-side disposition mechanism competing with
 * the manifests — is refused for the reason `mca/README.md` refuses a second
 * calculator: *"Two calculators drift, and when they disagree there is no
 * principled way to say which is right."* Two registers of what was done about
 * a finding is the same defect about the same facts.
 *
 * WHAT COUNTS AS OUTSTANDING IS NOT DECIDED HERE. `outstandingFindingsFor`
 * already answers it — survived refutation, and disposed of by nobody — and
 * that includes `unrecorded`, which is REVIEW-02's whole register because that
 * review kept its dispositions in prose. Unknown is not done, and a clause held
 * by a bookkeeping gap in another repository is held honestly.
 *
 * PASS ONLY THE FINDINGS FOR THE CLAUSE BEING APPROVED. This does not filter,
 * because a filter here and a filter at the caller is two places to get the
 * scope wrong.
 */
export const findingsHold = (outstanding: ReviewFinding[], evidenceAvailable: boolean): string | null => {
  /*
    FAIL CLOSED WHEN THE REGISTER IS NOT READABLE, AND SAY SO BEFORE ANYTHING
    ELSE.

    `outstandingFindingsFor` reads a JSON file off disk and returns `[]` when it
    is absent, so an unreadable register and a clause with nothing against it
    are INDISTINGUISHABLE — the same observation `surface/view.ts` makes about
    `source-missing`: "an empty finding list and an unreadable one look
    identical on a page". On a page that is cosmetic. On the gate that decides
    whether counsel's sign-off may be recorded it is a gate that silently stops
    gating, which is this repo's characteristic failure rather than a
    hypothetical one.

    `docker/Dockerfile` copies the register today, so this refuses nothing now
    and is the whole guard the day somebody edits that COPY line. The flag is
    passed in rather than read here so the rule stays pure and the environment
    fact stays at the edge.
  */
  if (!evidenceAvailable) {
    return 'The review register is not readable in this environment, so what the two document reviews found against this clause cannot be checked. An approval recorded now would be recorded against unknown evidence.';
  }

  if (outstanding.length === 0) {
    return null;
  }

  /*
    Named and quoted, one line each, rather than counted. "3 findings
    outstanding" makes somebody go looking; the id puts them where the work is.
    Two findings on one clause stay two lines — collapsing them would let
    disposing of the first clear the second.
  */
  const lines = outstanding.map((finding) => {
    const statement = finding.finding.trim();

    return `${finding.id}: ${statement.length > 120 ? `${statement.slice(0, 117)}…` : statement}`;
  });

  const noun = lines.length === 1 ? 'a finding' : `${lines.length} findings`;

  return `A review recorded ${noun} against this clause that no manifest disposes of — ${lines.join('; ')}. Record the disposition in the review manifest in lombard-contracts and re-vendor the register before approving this wording.`;
};

/**
 * A finding counsel recorded through a review link, which nobody has answered.
 *
 * NOT THE SAME REGISTER AS `findingsHold` ABOVE, and the difference is the
 * whole reason both exist. That one reads the vendored record of the two
 * adversarial document reviews, whose dispositions live in `lombard-contracts`
 * manifests; clearing one means editing a manifest in another repository and
 * re-vendoring. This one is a first-party objection from a named attorney, it
 * arrived through a link we minted, and it is answered on `/admin/mca` in a
 * form. One register per origin — the objection to a second register was that
 * two copies of the SAME findings drift, and no manifest has ever held one of
 * these.
 *
 * WHAT IT IS FOR. Without it the textarea on the review page is decorative:
 * counsel writes "this indemnity is unenforceable in New York", it lands in a
 * table, and the clause is approved that afternoon by somebody who never saw
 * it. The lease shipped exactly that — `approve` never consulted a finding —
 * and CI was green throughout, because every unit was tested in isolation and
 * nothing asked whether anything called them.
 */
export const counselFindingsHold = (unanswered: number): string | null => {
  if (unanswered <= 0) {
    return null;
  }

  const noun = unanswered === 1 ? 'a finding' : `${unanswered} findings`;
  const them = unanswered === 1 ? 'it' : 'them';

  return `Counsel recorded ${noun} against this clause through a review link, and nobody has answered ${them}. Answer ${them} on /admin/mca before recording an approval of this wording — an approval written over an unanswered objection records that an attorney signed off on text another attorney had just objected to.`;
};

/**
 * The one door every caller goes through before an approval is written.
 *
 * ORDER MATTERS AND IS THE SAME ORDER THE LEASE ROUTER ARGUES FOR. The
 * admission is a fact about the person: reading a finding will not fix it, so
 * sending somebody to a manifest they could never approve past is wasted work.
 * The finding comes second because it IS fixable, by somebody, today. The
 * fingerprint check is last and lives at the caller, because it says "reload
 * and read it again" and a second reading followed by a second refusal is the
 * same waste pointed the other way.
 */
export const approvalBlocks = (
  clause: McaClause,
  context: {
    admission: McaJurisdiction | null;
    outstanding: ReviewFinding[];
    /** Whether the review register was readable. See `findingsHold`. */
    evidenceAvailable: boolean;
    /**
     * Findings counsel recorded through a review link that staff have not
     * answered.
     *
     * OPTIONAL, AND THAT IS A KNOWN RISK RATHER THAN AN OVERSIGHT. Making it
     * required would have forced every existing caller and test to count rows
     * they have no database for. The cost is that a caller which stops passing
     * it goes quietly back to the old behaviour, which is the exact shape of
     * the failure this whole rule was written to prevent — so the caller that
     * matters is asserted in `mca/review/__tests__/findings-wiring.test.ts`
     * rather than trusted.
     */
    unansweredCounselFindings?: number;
  },
): string | null =>
  admissionBlocks(clause, context.admission) ??
  /*
    COUNSEL'S FINDING BEFORE THE VENDORED ONE. Both are fixable, so neither has
    the admission's claim to come first, and the tie is broken on how long the
    fix takes: answering counsel is a form on `/admin/mca`, while clearing a
    vendored finding means editing a manifest in lombard-contracts and
    re-vendoring the register. Surfacing the slower errand first would send
    somebody on it while the short one was still open.
  */
  counselFindingsHold(context.unansweredCounselFindings ?? 0) ??
  findingsHold(context.outstanding, context.evidenceAvailable);
