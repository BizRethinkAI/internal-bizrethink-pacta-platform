# ADR 0020 — The MCA vertical's decisions, consolidated

- **Status:** Accepted
- **Date recorded:** 2026-09-15
- **Decision date:** 2026-09-15 (repository owner approved the compaction)
- **Supersedes:** ADRs [0008](0008-mca-is-two-surfaces-not-one.md) through
  [0019](0019-split-funding-letters-are-processor-controlled.md), as the
  statement of what is currently decided. Those files stay unchanged as history
  of how each decision was reached.

## How to use this file

**This is the MCA rulebook.** Read it instead of ADRs 0008–0019. Each rule names
the ADR it came from, so the reasoning can be traced.

**It makes no new decision.** It restates what 0008–0019 decided, applies each
later ADR's changes to the earlier ones, and drops what has been overtaken. Where
an older ADR disagrees with this file, this file governs. The statements this
removes are listed under **Corrections** below.

**It records decisions, not progress.** What is built, deployed or still missing
belongs in `docs/STATE.md`. The index at [`README.md`](README.md) shows each
ADR's status.

**To change a rule, write a new ADR that supersedes the rule here.** Do not edit
this file's decisions, and do not reopen a question from the closed-questions
table without one.

## 1. What the vertical is

1. **Pacta builds merchant cash advance document packages** (0010). An
   interview selects clauses from a library, and the result is a set of documents
   for one funder's product.
2. **Facts in, documents out** (0010). `lombard-platform`, or any funder's own
   system, computes the numbers and supplies deal facts. Pacta holds the words
   and assembles. Pacta has no disclosure calculator. A funder's system holds no
   clause text.
3. **One MCA workspace, separate typed catalogues** (0015, replacing 0008's
   separate products):

   | Catalogue | Holds | Review |
   |---|---|---|
   | Clauses | numbered operative provisions only | counsel approval per clause |
   | Reusable content | field groups, document blocks, interview-only guidance | reviewed as authored text where it is legal wording |
   | Disclosures & requirements | regulator-prescribed forms and content requirements | read-only verification, no approval action |
   | Templates | a funder's saved package recipe | see section 6 |

   The catalogues share provenance, identity, review, versioning and
   fingerprinting. Typed entry points enforce the boundary. A UI filter over one
   mixed list does not.

## 2. Whose words, and what that means

There are three kinds of text, and each has its own authority.

1. **Regulator's words: prescribed disclosures** (0008). They are transcribed
   verbatim, verified by two dates (`verbatimVerifiedAt`,
   `structureVerifiedAt`), and never approved or edited by anyone. Approving a
   regulator's text is a category error. Conformity results are not attorney
   approval. Nothing in the clause rules below applies to `mca/sources/`,
   `mca/content/` or `mca/prescribed/`.
2. **Our words: clauses and reusable legal wording** (0008, 0012). They are
   authored, carry `examinedBy`, and reach a merchant only under counsel approval
   pinned to a content fingerprint that lapses when the content changes.
3. **A processor's words: split funding letters** (0019). A letter always
   belongs to a specific processor and is used exactly as that processor
   supplies it: wording, structure and layout. There is no generic letter, and
   nobody edits a processor's form. Only its blanks are filled. Payzli is the
   first supported processor. Its original format is the existing Payzli
   template in the `lombard-api` team (owner, 2026-09-15). A later processor
   brings its own form. **A conflict between a letter and the FRPA is resolved
   in our documents, the deal facts or the processor choice, never in the
   letter.**

## 3. Counsel and publication

1. **Counsel is parallel, not a gate on building** (0009). Authoring, internal
   rendering, internal review and sending text to counsel need no attorney.
   **Text reaching a merchant does.**
2. **The merchant output path must fail closed** (0012, 0013, 0015, 0016).
   `assertPublishable` today reports problems and refuses nothing. The first
   merchant-bound output must refuse unapproved or unverified content, with the
   test written first. None of the following is send or sign authority: a saved
   recipe, a draft-rendering grant, an internal PDF, or completed review
   coverage.
3. **Findings from REVIEW-01/02 are drafting input** (0012). They do not render
   to counsel as annotations. A clause's legal status (`WhyThisClause`) does
   render, because it describes the text in front of the reader (0014).
4. **Counsel review is snapshot-based** (0017, 0018).
   - Package links freeze an immutable, fingerprinted snapshot of all
     instruments, reusable items, numbering contexts and requirement
     specifications. Roles in them are neutral.
   - A finding may target up to 50 items: package, instrument, content,
     requirement or processor form. A target outside the snapshot is rejected.
   - A shared-library finding holds the affected content against new approval.
     A provider finding belongs to that provider revision and never changes
     library approval.
   - Review completion means every unit was acknowledged, no finding is
     unanswered, and the processor text is present. It is coverage of a saved
     copy, not approval.
   - A stored `kind` (`library` or `provider`) must agree with the snapshot and
     scope on every read and write.
   - Legacy single-instrument links keep their original scope.

## 4. The library

1. **It is a library, not a document** (0011). It is a selectable corpus at its
   own version line, starting at 1. Nothing is deleted for being unused by
   today's funder. **Numbers are derived at selection, never stored.** A clause
   that is not selected leaves no gap. References use identity tokens
   (`[[clause:…]]`, `[[section:…]]`); a missing, duplicate or malformed reference
   fails selection.
2. **The baseline document is input, not specification** (0012, 0013).
   `Lombard_FRPA_v4` and its sibling documents were drafting input. Clause bodies
   are written, not transcribed. Transcription guards are retired:
   - `bodies-match-the-document`;
   - line accounting;
   - selection completeness.

   What replaces them:
   - the vendored-file digest assertion;
   - **cross-reference coherence**: every reference in a selected clause
     resolves to a selected target;
   - counsel approval.
3. **`lombard-contracts` is downstream** (0012). Its rendered documents follow
   the library, not the reverse.
4. **Parties are roles** (0012, corrected by 0013). There are exactly three
   placeholders: `{{funder}}`, `{{equipmentAffiliate}}` and `{{processor}}`.
   *Merchant* and *Buyer* are defined terms, not placeholders.
5. **Every clause answers two questions** (0014). A test refuses a clause that
   answers neither.
   - `WhyThisClause`:
     - `compelled` (citation plus when it applies);
     - `implements` (statutory duty, our wording);
     - `discretionary`.
   - `ClauseVariance`:
     - `offered`, on a fact;
     - `fixed`, with a required `note` and one reason: `compelled`,
       `misattributed`, `no-alternative`, `unwritable` or `load-bearing`.
   - `compelled` may be claimed only where a vendored source supports it. The
     old `requiredBy` string is gone.
6. **`examinedBy` stays required and non-empty** (0011, 0012). With no document
   to match, "who read this?" must always have an answer. The one exception, from
   #212: a new field-only record with no legal prose may say review is pending,
   with real source links. No record may carry a fabricated historical review.

## 5. Facts, selection and variance

1. **A funder profile describes the funder's design** (0013). It does not
   describe the baseline document. An unverified answer says `UNCONFIRMED` in
   the row. A fact row and the clauses it gates change in the same commit.
2. **Two layers** (0011, implemented by 0016).
   - **Template facts** are answered rarely, per funder, in Pacta's interview,
     and produce a fixed clause set.
   - **Deal fill** happens per transaction and fills fields. **Deal fill never
     selects clauses.**
   - **`processorSplitAccepted` is a per-deal fact** and should leave the funder
     profile (0014).
   - **`recipientStates` is the seam to watch** (0011): a merchant property
     answered at template time as base or Texas.
3. **A fact value is never a global decision** (0011). Every value of every fact
   has at least one clause selectable under it, or is a listed gap in
   `every-fact-value-is-reachable`.
4. **The partition rule** (0013):
   - A fact gates whole clauses only, and its values must partition the clauses
     it gates. For every value, exactly one clause of the group is selected.
   - When a fact seems to decide a limb, the clause holds two rules and is split
     into an exhaustive pair. `includeWhen` never gains limb granularity.
   - **If the limbs bind different parties or answer different questions, the
     gate is misattributed:** use `includeWhen: null` plus a cross-reference.
   - Pinned counts are record counts; move them in the same commit.
5. **An interview question exists only where variance is `offered`** (0014).
6. **Pacta is the platform and holds no commercial position** (0014). A lawful
   term a funder wants is supported, and nothing lawful is refused on
   preference. Whether a term is lawful is the statute's call, recorded as
   `compelled`, not Pacta's opinion. The library ships defaults, and a funder
   changes them.
7. **Equipment** (0013). The funder decides whether equipment is offered
   (`'none' | 'merchant-elects'`). The merchant elects buy or lease at signing.

## 6. Provider templates and transactions

1. **Provider templates are team-owned with immutable revisions** (0016).
   - A revision stores the profile, the assembled snapshot, a fingerprint, the
     actor and the time. The version advances by compare-and-swap. No revision
     is ever updated.
   - Every endpoint checks live team membership before the `mca-builder` grant.
     Policy writes need team ADMIN or MANAGER. A feature grant never lets an
     instance admin into another team.
   - Preview needs the separate `mca-clause-draft-rendering` grant and
     recompiles against current records. A changed fingerprint needs an explicit
     new revision.
   - Answers the library cannot support fail validation.
   - **No native upstream Envelope template is created as a shortcut** around
     MCA approval, findings, disclosure or signing checks.
2. **Processor forms are external requirements** (0016, 0019). A template
   records the form's title, version and reference, and never generates a split
   funding letter.
3. **Transactions** (implemented in #212 under the rules above). A per-deal
   fill uses the latest current revision and is stateless. Its output is an
   internal draft that is never ready to send. No input can assert a signature,
   processor acceptance or legal approval.

## 7. State requirements

1. **Satisfy must-not-contain rules in the base form** (0011): Texas
   confession of judgment, Connecticut prejudgment-remedy waiver, Virginia
   out-of-state forum. Each rule satisfied in the base is a variant never built.
2. **Only Texas needs a template variant** (0011). It needs the 7 TAC §86.310(d)
   OCCC notice, conspicuous and verbatim, as its own clause gated on
   `recipientStates`. The variable-payment-methodology duties found for Georgia,
   Utah, Kansas and Missouri are implemented in shared wording, not variants
   (#180).
3. **Separate disclosure documents are the other surface** (0008). They are
   never clauses with a variance.

## Closed questions

Do not reopen these without a superseding ADR. This table merges the
closed-question tables of 0012, 0013, 0014 and 0019, with their corrections
applied.

| Question | Answer | From |
|---|---|---|
| Is the library a transcription of the baseline document? | No. It is an authored corpus; the baseline is input. | 0012 |
| Should a clause body match `Lombard_FRPA_v4`? | No. | 0012 |
| Do `[Reserved]` sections exist? | No. An unselected clause leaves no gap. | 0011, 0012 |
| Is fidelity to v4, line accounting or selection completeness a test we keep? | No. Replaced by cross-reference coherence. The digest assertion stays. | 0012, 0013 |
| Do review findings render to counsel? | No. They are drafting input. `WhyThisClause` does render. | 0012, 0014 |
| Is `lombard-contracts` upstream of the library? | No, it is downstream. | 0012 |
| How many party placeholders are there? | Three: `{{funder}}`, `{{equipmentAffiliate}}`, `{{processor}}`. | 0013 |
| Does the baseline's numbering bind us? | No. Numbering is derived at selection. | 0011, 0012 |
| Does a funder profile record v4's values? | No. It records the funder's design and says `UNCONFIRMED` where unchecked. | 0013 |
| Does the funder choose buy versus lease? | No. The funder offers equipment; the merchant elects. | 0013 |
| May a fact row move before the clauses it gates? | No. Same commit. | 0013 |
| When a fact seems to decide a limb? | Split into an exhaustive pair; exactly one clause per value. | 0013 |
| Should `includeWhen` gain limb granularity? | No. | 0013 |
| Limb problem or misattributed gate? | Different parties or questions means misattributed: `includeWhen: null` plus a cross-reference. | 0013 |
| Do pinned clause counts forbid splitting? | No. They are record counts. | 0013 |
| Does REVIEW-02 still need a manifest? | No. It has one (`lombard-contracts` #9). | 0013 |
| Is "not legally required" enough to make a clause an interview question? | No. Four fixed reasons can defeat it. | 0014 |
| Does Pacta decline a lawful term it disagrees with? | No. The funder's commercial choice is the funder's. | 0014 |
| Where is a refusal to gate recorded? | In `ClauseVariance.note`, not a code comment. | 0014 |
| Is `requiredBy` the legal-status field? | No. Replaced by `WhyThisClause`. | 0014 |
| Is full-performance guaranty (or arbitration) a named gap nobody authors? | No. Both are authored library options. | 0014 |
| Is split funding one of our agreements? Can we write a generic letter or edit a processor's form? | No, no, and no. It is the processor's form, used exactly. | 0019 |
| Can counsel approve a regulator's prescribed text? | No. Conformity is verification, not approval. | 0008 |
| Does building the library wait for counsel? | No. Only merchant output does. | 0009 |
| Where does the builder live? | In Pacta. The funder's system supplies facts and numbers. | 0010 |

## Directions recorded but not yet carried out

These were decided and are not built. This is not a status report; STATE.md
tracks progress.

- **The guaranty gets its own numbering series** (0011 phase 5). Today it is a
  section inside each instrument's numbering.
- **`processorSplitAccepted` moves to deal fill** (0014).
- **Collection by ACH** (0011 pending decision 3). Under
  `split-with-ach-backstop`, the narrow v3 §2.5 backstop is the clause that
  returns. v3 §7.14's blanket debit authority does not.
- **A funder-state venue needs a `funderState` input** before
  `venueRule: 'funder-state'` is writable (0014).
- **The package readiness view and merchant-output enforcement** (0015, 0016).
- **Replace the retained Payzli letter text** with the `lombard-api` Payzli
  template's wording, verbatim, and move the letter out of the clause catalogue
  (0019).

## Corrections

These statements in ADRs 0008–0019 are wrong or overtaken. This file governs
over them.

| ADR | Statement | Now |
|---|---|---|
| 0008 | The MCA vertical is two products with two surfaces and navigation | One workspace, separate catalogues (0015) |
| 0008 | Payzli is among "our" negotiated agreements | Processor-controlled (0019) |
| 0008 | Clause library ships only after conformity, and waits on counsel | Parallel (0009) |
| 0008, 0009, 0010 | 140 or 192 clauses | Counts move; see STATE.md |
| 0011 | Status "Proposed" | Accepted; phases 1–4 built (#171) |
| 0011 | Fidelity assertion kept; rule 2 narrows | Retired (0012, 0013) |
| 0011 | `kind` values `field-group` and `explainer` inside the clause catalogue | Reusable content catalogue (0015) |
| 0011 | `requiredBy?: string` | `WhyThisClause` (0014) |
| 0011 | `equipment` has four funder-side values | `'none' \| 'merchant-elects'` (0013) |
| 0011 | Eleven facts | Twelve; `settlementBase` added |
| 0012 | Placeholders include `{{merchant}}` and `{{broker}}` | Three placeholders (0013) |
| 0012 | REVIEW-02 lacks a manifest | It has one (0013) |
| 0012 | "A clause with `author: null` cannot reach a third party" | Reports only; no merchant path exists yet (0013) |
| 0013 | Consequences paragraph mixes "four" and "three" of eleven facts inert | Superseded; which facts are inert is status in STATE.md |
| 0013 | Full-performance guaranty is a deliberate, named gap | Authored (0014) |
| 0013 | The guarantor field group is ungated; equipment instruments unreviewed | Overtaken (0014; later rewrites) |
| 0015 | "Application implementation pending" | Implemented (#208, #215) |
| 0016 | "Proposed implementation; merge pending" | Implemented (#210) |
| 0017, 0018 | "Accepted for implementation" | Implemented (#234; #236 promoted in #250; repairs #258, #260, #268) |
