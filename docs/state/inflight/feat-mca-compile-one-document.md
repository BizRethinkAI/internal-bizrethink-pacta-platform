# feat/mca-compile-one-document — the last cross-document reference

**Stacked on `feat/mca-retire-deal-path` (#306).**

ADR 0026 makes each document its own template. That is only possible if no
document depends on another being compiled alongside it. **Exactly one did.**
This removes it, and asserts none returns.

## What changed in the library

The ISO PRA's commission clause read:

> An Origination Fee is not actually collected on a transaction that Merchant
> cancels under **Section [[clause:frpa.right-to-cancel-4-14]]** of the Future
> Receivables Purchase Agreement

It now names the provision instead:

> …that Merchant cancels under **the Right to Cancel provision** of the Future
> Receivables Purchase Agreement

Clause version bumped 2 → 3, so any approval over the old words lapses. The
words changed; an approval of them should not survive.

**The number was always the fragile part.** ADR 0011 derives numbering from what
survives selection, so a clause dropping out of the FRPA moved this citation.
Naming the provision survives both that and the split into separate templates.

## Three tests this touched, none deleted

**`numbering.test.ts` — inverted, deliberately.** It asserted that moving an FRPA
clause *stales* a review of the ISO PRA. True, and true *because* of the
citation. It now asserts the opposite — the ISO PRA's fingerprint is independent
of FRPA numbering — because that independence is what lets it compile alone.

A second assertion was added: **nothing in the ISO PRA library crosses a
document**. It caught a real miss immediately — I had reworded only the clause I
grepped for, and there were more references to check.

Its first regex was also wrong, matching `[[section:commission]]` — the
document's *own* section — as a crossing. Corrected and proved against four
shapes: `clause:frpa.x` and `section:frpa#y` cross; `section:commission` and
`clause:iso-pra.x` do not.

**`coverage.test.ts` — divergence declared, not fudged.** Coverage maps every
line of the source document to a clause, and our clause no longer matches the
source's "Section 4.14". Mapped back in `historicalIsoContent`, exactly as the
generalized field anchors already are, with the reason written beside it.
Coverage exists to notice *prose* going missing, and can only do that if a
deliberate divergence is declared rather than left to read as a loss.

**`reading-routes.test.ts` — expectation flipped to false, scenario kept.** The
reference *machinery* is untouched and still tested directly, on a synthetic
clause. This now asserts the library no longer uses it; a clause reintroducing a
cross-document citation flips it back to true and fails here.

## Not in this change

**The compiler still returns a set.** Making it take one named instrument and
return one document is the next piece — and it has to land together with the
template record gaining an instrument column, because until then the services
have nothing to pass it. That work is written and held back rather than
half-landed; it touches fifteen test files and three callers.
