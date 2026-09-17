# feat/mca-recipient-contract — who signs, and under what name

**Stacked on `feat/mca-template-contract` (#289)**, which vendored the live
template records this reads. Merge that first.

**What this is:** item 2 of `docs/design/mca-template-publication.md` — the
recipient model. Like #289 it adds no behaviour; it writes down what the live
templates expect and checks the library against it.

## The finding that matters

**This half of the contract fails loudly. The widget half does not.** A send
names recipients by **role key** (`recipients: { merchant: {...}, guarantor:
{...} }`), and `sendDocument` throws `recipient "x" expected by template but not
provided` when a key it expects is missing. A widget name that stops matching,
by contrast, raises nothing at send time — it is a blank in a signed document
(#289), caught only by a CI spec on their side that cannot see a template
republished from here, plus the runtime warning in lombard-platform #262. Both
are interfaces this repository does not deploy; knowing which one refuses to
proceed changes how carefully each has to be handled at the first publication.

The role key is load-bearing in the return direction too: the platform reads
`recipientTokens.merchant` and `signingUrls.merchant` back out by the same key.

**The numeric recipient ids are not a contract.** `/template/use` takes
`{ id, email, name }`, where the id belongs to the template recipient and is
captured at publication. A template the builder publishes has new ids, so the
record carrying them must be updated — ADR 0023 §2's point, restated in
mechanism rather than principle. Order and role are template properties,
inherited by every send, so the builder sets them once when it publishes.

## What the test checks

- Role names and signing order match the live record exactly, per instrument.
- Every party has both a `.signature` and a `.signedDate` binding carried by a
  clause of that instrument.
- **No signature block without a signer, and no signer without one.** The
  failure this catches is a document that cannot complete because nobody is
  asked to sign a block that exists, or one that completes without the
  signature it was sent for. Only visible by comparing the two lists.
- The guarantor stays a recipient in their own right on all four instruments
  where one signs — a separate legal capacity, so a separate token and audit
  trail, even when the platform sends both rows to one address.
- `split-funding` is absent from the produced set (ADR 0019), and the library
  carries no signature binding for it.

Verified the test bites, not just passes: renaming a role and pointing it at the
wrong signer failed two assertions.

## One thing recorded, not resolved

`counter_signer` (the lease's third party) is the funder's own side; the library
calls the same signature the equipment provider's. Two names for one party. The
name that survives is a first-publication decision, like `lombard_signer_name`
in #289.
