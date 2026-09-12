# feat/mca-derived-numbering — ADR 0011 phases 1–4

**Branch:** `feat/mca-derived-numbering`, from `005db8e46` (merged #168).
The stale memo-refutations note was folded into `docs/STATE.md` and removed.

## Result

`McaClause.number` is removed. Selection first applies existing whole-clause
gates, orders the surviving records, then emits consecutive `section.clause`
numbers. No placement table or source-number fallback remains. All six
instruments use this rule; a section holding only unnumbered material consumes
no section number. The guaranty's separate numbering series is still phase 5.

Bodies now cite stable clause identities (`[[clause:...]]`) or logical groups
(`[[section:...]]`). Seven opposite-rule pairs share a canonical `referenceId`.
Missing targets, duplicate selected identities and malformed tokens throw an
`AppError`. The ISO's FRPA cancellation citation uses the same fact profile as
the ISO selection. External section references use `instrument#section`.

The granting clause, definitions, fee provisions, service provisions and other
operative text receive citations. Explicit `unnumberedReason` decisions cover
parties/recitals, lead-ins, execution, the funding grid and the four funding
notes, now `kind: explainer`. Named grid labels and exhibit titles replace
source Section 1 / Appendix A / Exhibit A or C labels. Existing numeric suffixes
inside slugs remain internal identity, not citations.

The source funding grid's 30 widgets are now a field-group record. Labels and
anchors are preserved, including labels still awaiting substantive form work.
`required: true` follows the existing field-group completion convention; this
is review metadata, not a new deal-entry form or a resolution of whether an
inapplicable field should accept N/A. No commercial values were populated.
The existing interest paragraph is a separate record rather than a hidden
second provision inside costs. Thus **FRPA 108 / entire library 211**; all five
count pins were updated deliberately. No existing record was deleted.

Ten ungated guarantor-limit citations now name the **separately signed Guaranty
of Performance**, preserving their limitation when `guarantyScope: none`
selects no guaranty. This implements the fix described in the former known-gap
register. The interest split closes its other gap. No dangling-reference
allowances remain.

## Review and migration behavior

Counsel and staff use the same compiled numbering. Counsel sees every record
once, human headings and field content, with internal slugs retained only for
finding/approval identity. The page says it is a library review and labels its
example profile, including the unconfirmed net settlement base. Excluded
alternatives are compiled under a named example that selects them; their
citations apply to that example, not to the base selection. These examples
change one fact at a time, matching the current gates. A future gate needing a
combination must supply a review example; the page fails rather than hiding it.

Clause approval fingerprints now include kind, fields, semantic targets,
unnumbered decisions and gate function source. A wording or gate change lapses
approval. Reordering alone preserves clause approval, but stales the review
link; review fingerprints include order, the example profile and any referenced
instrument's context. All pre-migration links/fingerprints become stale.
Gate-source hashing is conservative: compilation/source representation changes
can invalidate an otherwise unchanged review, so create links through the app's
own server runtime, not by copying a fingerprint from a separately transpiled
script. No approval records are migrated or silently grandfathered.

Historical review loci stay tied to the untouched vendored source documents.
The remaining source-content coverage checks disregard heading ordinals and
citation labels, while preserving other text. Their positive control still
catches the originally omitted ISO disclosure clause. Semantic-target and
selection tests independently check the citations. The twin divergence checks
also use semantic pair identities, preserving the five substantive divergences
and all eleven vocabulary exceptions.

## Validation

- Baseline: 69 MCA files / 2,790 tests, typecheck and format clean. Exact main
  baseline Playwright run `34663118705` succeeded before this change.
- New numbering tests failed on the old stored-number implementation. Further
  failing tests exposed sentence-final citations, missing field/variant content,
  malformed tokens and stale cross-instrument citation context before fixes.
- Local MCA regression suite: 71 files / 2,821 tests; standalone package typecheck
  passes. Biome has only the pre-existing oversized `font-data.ts` info.
- Compared all 209 pre-migration records: ordered body widgets, commercial
  literals, existing fields, source/status and examination links are unchanged;
  costs are compared after separating the exact existing interest paragraph.
- Actual local FRPA browser view: 108 headings, 36 field widgets, nine labelled
  alternatives, no raw reference tokens and no visible clause slugs. The other
  five actual review pages also show exactly 30/30/28/7/8 records with resolved
  citations and no visible slugs. The stale-link notice was verified using the
  script-created fixtures; server-created links use the server fingerprint.
- Full PR CI, including Playwright, must pass before the implementing session
  stops. The human reviews and merges; the implementer does not merge.

## Still separate work

No prescribed disclosure or statutory source changed. No merchant rendering,
PDF assembly, publishing or sending path was introduced. All authored source
records remain draft with null authors. A future merchant render must fail
closed before output; `assertPublishable(draft)` returning an empty list is not
permission to publish.

The five Pacta templates (100, 102, 119–121) and the sibling Word/PDF forms are
not rebuilt here. Rebuild them from the selected corpus in the separate form
migration, then validate every citation and widget against that selection;
never translate an old review locus to a new number by matching digits.
Guaranty placement/numbering (phase 5), remaining form labels, commercial
interview answers and independent counsel review remain separate work. The
mandatory fresh adversarial review is started by the human, not a subagent.
