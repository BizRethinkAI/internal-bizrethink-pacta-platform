# ADR 0019 — Split funding letters are processor-controlled forms

- **Status:** Accepted
- **Date recorded:** 2026-09-15
- **Decision date:** 2026-09-15 (repository owner). It settles a clarification
  first recorded softly in `mca/clauses/README.md` on 2026-09-12.
- **Supersedes:** the Payzli entry in [ADR 0008](0008-mca-is-two-surfaces-not-one.md)'s
  "Negotiated agreements … **ours**" row. Also the "limited or no ability to
  change" wording in `mca/clauses/README.md` and `docs/design/mca-workspace.md`,
  which read as though some change might be possible.
- **Does not decide:** how processor acceptance of a split is evidenced
  (`processorSplitAccepted`). That remains separate work.

## Context

A split funding letter is the merchant's instruction to its card processor to
send a share of settlement to the funder. Whether the split happens depends on
the processor acting on that letter, so the processor decides what the letter
says.

The repository has not treated it that way. ADR 0008 listed the Payzli letter
with the FRPA as one of "our" negotiated agreements. The clause library imported
its seven paragraphs as `attorney-drafted` clauses with approval fingerprints.
REVIEW-01 and REVIEW-02 raised findings against its wording. `lombard-contracts`
then edited the letter to match the FRPA (change note 16). The owner's first
clarification on 2026-09-12 said processors *commonly* allow "limited or no"
changes, which still left room to argue for a change. This topic has been
revisited in several sessions. This ADR closes it.

## Decision

**A split funding letter always belongs to a specific processor. Pacta uses that
processor's form exactly as the processor supplies it: its wording, structure and
layout.**

1. **No generic letter, ever.** Pacta does not build, generate or keep a generic
   or funder-neutral split funding letter or template. One letter cannot serve
   two processors.
2. **Never edited.** Nobody changes a processor's form: not to match the FRPA, not
   to fix a review finding, and not to generalize it. Filling the processor's own
   blanks with deal values is the only permitted change.
3. **One form per processor.** **Payzli** (United Payment Systems LLC d/b/a Payzli)
   is the first processor that supports split funding and is the only one today.
   More processors can be added when needed. Each addition brings that
   processor's own form, as supplied, tied to that processor's identity. A new
   version issued by a processor is added as supplied. It does not rewrite the
   earlier version's record.
4. **Conflicts are resolved on our side.** A finding that the processor's letter
   conflicts with the FRPA or another Pacta document is resolved in *our*
   documents, in the deal facts, or in the choice of processor. It is never
   resolved by editing the letter. Counsel may still review the letter and record
   findings, and a finding against it is evidence, not an instruction to change it.

## Consequences

**The existing Payzli text is not verified as Payzli's form, and must be.** The
retained `Lombard_Payzli_Split_Funding_Authorization_v2` is the result of our own
edits. It is the source of the library's seven `split-funding.*` records, and an
edited revision of it was published as Pacta template 102 (the id listed on
2026-09-06 in `lombard-contracts/CONTRACT_INDEX.md`). Compared with its 2026-09-02
import into `lombard-contracts` (`f8f2718`), commits on 2026-09-05 and 2026-09-07
added:

- the dated Purchase Agreement recital;
- the "not from any deposit account of Seller" limit;
- the Purchased Amount sentence and the Completion Threshold stop route;
- the "relates only to the Purchase Agreement" sentence;
- the remittance-instructions block;
- the SELLER signer label and the signer date field.

Neither repository establishes that even the 2026-09-02 text is the form Payzli
issues. Under this decision:

- Obtain Payzli's current split funding form from Payzli. Replace the retained
  text with it verbatim, recording its title, version and where it came from.
- Re-check the FRPA against that form, including the Completion Threshold,
  deposit-account and acceptance provisions, and resolve any conflicts in the
  FRPA.
- Rebuild the published Payzli template from the verified form before a Payzli
  letter is next sent.

These are follow-up tasks. This ADR changes no legal wording, stored record,
fingerprint or template.

**The letter should not be a clause-catalogue entry.** Its paragraphs carry
`source: attorney-drafted`, approval state and variance metadata, all of which
describe text we author. [ADR 0015](0015-one-mca-workspace-with-separate-content-catalogues.md)'s
catalogue boundary already treats processor forms as external requirements in
templates ([ADR 0016](0016-mca-provider-template-revisions.md)) and as
controlled forms in counsel review ([ADR 0018](0018-holistic-mca-findings-and-provider-review.md)).
Moving the retained letter out of the clause catalogue, without copying any
approval onto it, is a separate implementation task.

**Past findings stay as history.** REVIEW-01/02 `payzli-*` findings and change
note 16's edits remain recorded. Any fix they propose is carried out, if at all,
in our documents under rule 4.

**What is already consistent with this decision and stays:** provider templates
record the processor form's title, version and reference as an external
requirement and never generate a split funding letter. Provider counsel reviews
preserve the processor's form text exactly as submitted, and review cannot be
completed while that text is missing. Payzli field labels in the reader are tied
only to Payzli passages whose content is pinned by a fingerprint.

## Alternatives rejected

**A generic split funding letter with processor-specific riders.** The processor
decides whether it acts on the instruction, so a letter it did not issue is a
letter it may refuse.

**Editing a processor's form to agree with the FRPA.** This is the path taken in
change note 16, and it produced a letter nobody can show the processor accepts.
The FRPA is ours to change. The letter is not.
