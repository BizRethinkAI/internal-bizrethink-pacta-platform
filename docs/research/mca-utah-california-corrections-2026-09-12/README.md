# Utah and California statutory-reference corrections

Utah's disclosure requirements now cite **§7-27-202**, and California's
state-rider assessment precisely cites **Financial Code §22806(b)**. The latter
was already using the correct section for pricing communications; it was not an
estimated-APR citation to renumber. This implements item 2 of the
[requirements-review queue](../mca-agreement-requirements-2026-09-12/README.md#implementation-queue).

Task: [#185](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/185).
Base: `1813b1d72fb231593ddcb2cb0b2a55054ac7f040`, after the prior MCA, field-policy
and engineering-workflow PRs merged. The source audit and requirements-review
evidence and manifests are unchanged historical records.

## Source trail and targeted verification

The implementation reuses the retained research rather than repeating the
eleven-state review. On **September 12, 2026**, the implementing session opened
the official Utah chapter index and linked PDF, California's current Division
9.5 and chaptered SB 362 using the web tool. The affected statutory paragraphs
and amendment histories agree with the earlier captures. These are additional
reading observations, not new archived HTTP responses or invented response hashes.

| Authority | Exact official location | Retained retrieval used |
|---|---|---|
| Utah chapter index | [Chapter 7-27](https://le.utah.gov/xcode/Title7/Chapter27/7-27.html) | Source-audit manifest `ut-landing`, `2026-09-12T08:42:06.050031+00:00` |
| Utah complete chapter | [Linked chapter PDF](https://le.utah.gov/xcode/Title7/Chapter27/C7-27_2022050420220504.pdf) | Source-audit manifest `ut-original`, `2026-09-12T08:39:57.332228+00:00`; raw response SHA-256 `9897aace38c58cabf845a403689fe9809f83e7c5bc3be01608a110bdf32585c0` |
| California current statute | [Financial Code Division 9.5](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=FIN&division=9.5.&title=&part=&chapter=&article=) | Requirements manifest `ca-finance-current`, `2026-09-12T17:06:55.786616+00:00`; raw response SHA-256 `a4834a4ea825c5b05ac934537638577209b8c4576b41d654e2894c02d8ca0152` |
| California amendment | [Chaptered SB 362, 2025 Ch. 352](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB362) | Requirements manifest `ca-sb362`, `2026-09-12T17:06:55.745333+00:00` |

The [source-audit manifest](../mca-source-audit-2026-09-12/manifest.json)
records the Utah response and independent whole-body comparison. The
[requirements manifest](../mca-agreement-requirements-2026-09-12/manifest.json)
records the California responses and retained text hashes. Its
[current-code capture](../mca-agreement-requirements-2026-09-12/evidence/ca-finance-22800-22807.txt)
and [SB 362 capture](../mca-agreement-requirements-2026-09-12/evidence/ca-sb-362.txt)
remain the independent inputs.

## What changes

**Utah:** §201 concerns registration; §202(2)(a)–(f) lists disclosure information.
The variable-payment disclosure is (e)(ii), while §202(3) puts methodology and
circumstances of variation in the agreement. Both top-level citations, all six
requirement citations and the methodology cross-reference now use §202. Rows,
evidence strings and the coverage algorithm are unchanged.

The active Utah file's new header records the audit's actual later retrieval,
while preserving the unknown original retrieval before the September 6 import.
Its complete body still matches audit hash
`060c5bea09bd05a2a76ed42c8dbc2ff8abfb3fd86f2b31a7376d47a53ffb99a5`
after whitespace collapse. The file's 2022 chapter marker does not erase its
2024 section amendments. The spec's normalized digest changes only because of
the header; `verbatimVerifiedAt` advances to `2026-09-12` for the corrected reading.
The existing source-origin classifier now recognizes the documented official
publisher. This is provenance evidence, not a full compliance verdict.

**California:** the new active source contains all eight statutory sections and
their histories. Site navigation and the division heading are removed from the
retained extraction; no statutory wording is changed.

| Current provision, effective January 1, 2026 | Meaning and disposition |
|---|---|
| §22805 | Estimated-APR protection, renumbered from former §22806 by SB 362. No live application citation was using §22806 for this protection. |
| §22806(a), (b), (c) | Deceptive use of interest/rate terms; APR in specified pricing communications after a specific offer; qualifying use of interest/rate terms. The state-rider purpose assessment specifically implements (b). |
| §22807(a), (b) | Enforcement provisions keyed to CFL-covered and other commercial-financing transactions. This correction does not implement enforcement logic. |
| 10 CCR §953(b) | The published regulation still refers to §22805 in discussing DFPI authority under other laws. Preserve that quotation; do not editorially substitute §22807 into a source document. |

Searches of live MCA code found no other §22805–§22807 application citation to
renumber. The state-rider's obsolete unverified-source comment is corrected and
its metadata narrows from §22806 to §22806(b). The California regulation source,
form specifications, financial formulas and all 211 authored clause bodies are
unchanged. The new statutory source supports review; it is not a fourth
California disclosure specification or an automatic conduct-compliance check.

The metadata change participates in existing approval/review fingerprints:
an approval of the old state-rider assessment is no longer current, and review
links covering the changed library can report moved content. The clause remains
draft with a null author; no approval or stored document is rewritten.

## Validation and limits

TDD first reproduced twelve failures: Utah finding citations and agreement
cross-reference, missing official-origin record, missing active California
statute and the imprecise live paragraph citation. After correction, **251 tests
across nine focused files pass**: the new regression, disclosure coverage,
provenance gate, source origin, conformity surface, earlier source corrections,
primary-source checks, clause metadata/fingerprints and state-rider/notice checks.
The old unknown-origin surface fixture now uses the still-unrecorded Virginia
form; the matching-digest/fresh-reading assertions remain intact.

The before-change Playwright evidence is
[run 34719946377](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34719946377)
on the exact base SHA above. Its shard executed successfully from 21:26:58 to
21:42:24 UTC, including `Run Playwright shard 1 of 1`; this was not a docs-only
skip. Current PR CI supplies the after gate, full tests/builds and separate type
checking. Final CI evidence belongs on the PR/task, without a status-only push.

No additional manual browser sweep is needed for the existing citation/origin
rendering; focused surface tests cover those outputs. Source and legal metadata
still require one fresh independent review started by Shwet. This correction
does not resolve Virginia's form, Georgia's full-code access, Missouri's
commencement history or the other agreement-rewrite queue items. It does not
establish deployment or actual provider communications compliance.
