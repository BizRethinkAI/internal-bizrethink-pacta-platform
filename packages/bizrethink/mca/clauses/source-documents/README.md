# The documents the clauses were taken from

Two kinds of vendored evidence, and they answer different questions.

## `*.txt` — the agreements themselves

Body text extracted from the `.docx` files in `lombard-contracts/sources/`, one
file per instrument, each with a header naming the source document, the
repository commit and the `.docx`'s own sha256.

Regenerate with `scripts/mca/vendor-agreement.py`; the extraction is
deterministic, so re-running it on an unchanged document reproduces the file
byte for byte.

**These are not statutes and the primary/secondary-publisher question does not
arise.** `mca/sources/` holds text a regulator wrote, where the risk is
transcribing from someone who reproduced it — that is what
`__tests__/sources-are-primary.test.ts` guards, and Georgia is why. Here the
words are ours, and the question is *which document, at which revision*.

What the digest buys is the reverse of the statutory case. There, a regulator
amends a rule under a spec that still quotes the old wording. Here, somebody
edits the `.docx`, re-renders, republishes — and the clause library goes on
asserting a superseded sentence with a verification date beside it. Same
failure, opposite direction, same fix.

## `review-register.json` — the two reviews, indexed

Derived from `REVIEW-01-findings.json` and `REVIEW-02-findings.json` in
`lombard-contracts` by `scripts/mca/build-review-register.py`. Regenerate and
diff; do not edit it by hand.

It keeps `id`, `severity`, `category`, `document`, `locus`, `finding` and
`decides`, and drops `evidence`, `consequence` and `fix` — the long-form fields
that carry the argument.

**Be exact about what this proves.** That a finding id a clause names is a
finding that was really raised, in a review that really ran, against a document,
and whether it survived refutation. It does **not** prove the finding says what
the clause claims it says. The argument stays in `lombard-contracts` and is not
reproduced here, so a reviewer following a finding id has to go and read it.

**And about what it cannot prove.** REVIEW-01's loci name the clause numbers of
the document *as it stood then* — `§A.5 Clawback Provision` is numbered A.4 in
the shipped v2, because the fixes that review produced removed a section above
it. A finding id therefore anchors to a clause by human judgement, recorded in
`examinedBy`, and not by a string match nobody could trust.
