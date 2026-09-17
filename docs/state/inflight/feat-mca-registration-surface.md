# feat/mca-registration-surface — what a state requires of the funder

ADR 0025 decision 2, carried out. The vertical is custodian of the landscape
around merchant cash advance, and a registration duty is part of that landscape
even though it appears in no document the builder produces.

## The library already held these; nothing could show them

`statutes/ct-va-obligations.ts` carries Connecticut's and Virginia's
registration duties verbatim, cited to section, re-matched against the vendored
statute on every run. There was no way to put them in front of the entity they
bind.

This adds that: `operatingRequirementsFor(states)` and a panel on the provider
template page, driven by the programme's own `policy.recipientStates`.

## Quoted, never advised

The discipline the disclosures already run under (ADR 0008): the statute's own
words, cited, re-matched, and **verified rather than approved**. It reports what
the law says. It does not say what anybody must do, and it **refuses nothing** —
where a funder operates is the entity's decision, and Pacta is not the business
engine.

## The silence is the dangerous part

An empty result could mean *"this state asks nothing of you"* or *"we have not
looked"*, and those are opposite facts with opposite consequences.

The library holds registration text for **two states of eleven**, so
`statesWithoutAnOperatingRecord` names the rest and the panel says so in as many
words — that an absent record is not a statement that a state requires nothing.
Letting absence read as absolution is the failure this guards against.

The 2-of-11 count is pinned in a test, so extending coverage is a visible diff
rather than something that quietly happens.

Same instinct as `StatutoryObligation.satisfiedBy` being nullable; in that
file's own words, the nulls are the useful half.

## Not in this change

**Coverage.** Nine states have vendored disclosure statutes but no extracted
registration duties. Adding one is research against a primary source, not
programming, and each belongs in its own change where the citation can be
checked.

The monthly source change-detection job stays deferred (ADR 0025 decision 3).
