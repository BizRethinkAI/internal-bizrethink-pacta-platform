import { describe, expect, it } from 'vitest';

import {
  type BaselinePackage,
  PAGE_IDENTIFICATION_ATTESTATION,
  READING_ATTESTATION,
  readyToApply,
  sidecarEntryFor,
} from './baseline-package';

/**
 * THE GATE BETWEEN A MACHINE'S WORK AND A RECORDED BASELINE.
 *
 * A `sourceDigest` asserts "a person read this page and it is the statute we
 * stored". Everything up to that assertion can be automated — fetching,
 * extracting, digesting, diffing, screenshotting — and none of it can make the
 * assertion, because a machine taking its own baseline hashes the page against
 * itself and blesses an amendment nobody saw.
 *
 * So the sign-off is STRUCTURAL rather than a habit. If it were a convention,
 * the first run would be human-verified and every run after would quietly not
 * be, and the baseline would stop meaning what it says while still saying it.
 *
 * Two sign-offs, because there are two different claims:
 *
 *   1. "this is the page where an amendment would appear" — which is not the
 *      same as "this is where the text came from". `TX-Fin-Code-Ch-398.txt` is
 *      the 2025 enrolled bill, a finished document that will read the same in
 *      2030; an amendment to Chapter 398 appears in the codified chapter at a
 *      different URL entirely. Baselining the recorded URL would have produced
 *      a watch that reports `unchanged` forever and can never fire.
 *   2. "I have read this page and it is the source we stored".
 */

const page = (url: string, digest = 'a'.repeat(64)) => ({
  url,
  finalUrl: url,
  httpStatus: 200,
  contentType: 'text/html',
  extractedChars: 14598,
  extractedDigest: digest,
  screenshot: 'evidence/tx.png',
});

const signed = (confirms: string, acknowledged: string[] = []) => ({
  by: 'repository owner',
  at: '2026-09-19',
  confirms,
  acknowledged,
});

const complete = (): BaselinePackage => ({
  file: 'TX-Fin-Code-Ch-398.txt',
  mode: 'baseline',
  generatedAt: '2026-09-19T00:00:00Z',
  pageIdentification: {
    recordedPages: [{ url: 'https://capitol.texas.gov/x.htm', provenance: "This file's own header." }],
    amendmentAppearsAt: ['https://tcss.legis.texas.gov/resources/FI/htm/FI.398.htm'],
    reasoning: 'The recorded URL is the enrolled bill, which is finished. The codified chapter is amendable.',
    signOff: signed(PAGE_IDENTIFICATION_ATTESTATION),
  },
  baseline: {
    pages: [page('https://tcss.legis.texas.gov/resources/FI/htm/FI.398.htm')],
    textComparison: {
      method: 'Operative provisions of §398.051(a)(1)-(11) compared against the stored bill.',
      verdict: 'equivalent',
      findings: 'All eleven disclosure elements present in both; only bill/code wrappers differ.',
    },
    visionCorroboration: { agreesWithTextVerdict: true, notes: 'Screenshot shows Finance Code Chapter 398.' },
    signOff: signed(READING_ATTESTATION),
  },
});

describe('readyToApply — what has to be true before a digest is recorded', () => {
  it('applies a package a person has signed at both phases', () => {
    const verdict = readyToApply(complete());

    expect(verdict.ok).toBe(true);
    expect(verdict.ok && verdict.pages).toEqual([
      { url: 'https://tcss.legis.texas.gov/resources/FI/htm/FI.398.htm', digest: 'a'.repeat(64) },
    ]);
  });

  /*
    THE WHOLE POINT. Everything else can be produced by a machine; this cannot.
  */
  it('refuses a package nobody has signed', () => {
    const unsigned = complete();
    unsigned.pageIdentification.signOff = null;
    unsigned.baseline.signOff = null;

    const verdict = readyToApply(unsigned);

    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.blocked).toContain('PAGE_IDENTIFICATION_NOT_SIGNED');
    expect(verdict.ok === false && verdict.blocked).toContain('READING_NOT_SIGNED');
  });

  it('refuses a reading sign-off while the page identification is unsigned', () => {
    const half = complete();
    half.pageIdentification.signOff = null;

    expect(readyToApply(half)).toMatchObject({ ok: false });
  });

  /*
    The attestation is an exact sentence, not a boolean. A `signedOff: true`
    field is set by anything that can write JSON; a sentence that has to match
    makes an absent-minded or automated sign-off visible in the record, and
    says in the record itself what was actually being claimed.
  */
  it('refuses a sign-off that does not carry the exact attestation', () => {
    const vague = complete();
    vague.baseline.signOff = signed('looks right to me');

    const verdict = readyToApply(vague);

    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.blocked).toContain('READING_ATTESTATION_WRONG');
  });

  it('refuses the two attestations swapped', () => {
    // They are different claims, so signing one does not sign the other.
    const swapped = complete();
    swapped.pageIdentification.signOff = signed(READING_ATTESTATION);
    swapped.baseline.signOff = signed(PAGE_IDENTIFICATION_ATTESTATION);

    expect(readyToApply(swapped)).toMatchObject({ ok: false });
  });

  it('refuses a signed package that never reached a verdict on which page to watch', () => {
    const noVerdict = complete();
    noVerdict.pageIdentification.amendmentAppearsAt = null;

    const verdict = readyToApply(noVerdict);

    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.blocked).toContain('NO_PAGE_IDENTIFIED');
  });

  /*
    THE TEXAS TRAP, AS A RULE. Phase one decides which pages get watched, so the
    pages actually fetched have to be those pages. A package that identified the
    codified chapter and then baselined the enrolled bill would record a digest
    for a document that can never change, over a signature saying otherwise.
  */
  it('refuses when the pages fetched are not the pages identified', () => {
    const drifted = complete();
    drifted.baseline.pages = [page('https://capitol.texas.gov/x.htm')];

    const verdict = readyToApply(drifted);

    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.blocked).toContain('PAGES_NOT_THE_ONES_IDENTIFIED');
  });

  it('refuses when one identified page was never fetched', () => {
    const partial = complete();
    partial.pageIdentification.amendmentAppearsAt = ['https://fl/a', 'https://fl/b'];
    partial.baseline.pages = [page('https://fl/a')];

    expect(readyToApply(partial)).toMatchObject({ ok: false });
  });

  it('refuses a page that came back with anything but 200', () => {
    const notOk = complete();
    notOk.baseline.pages[0].httpStatus = 403;

    const verdict = readyToApply(notOk);

    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.blocked).toContain('PAGE_NOT_FETCHED_CLEANLY');
  });

  it('refuses a digest that is not a sha256', () => {
    const bad = complete();
    bad.baseline.pages[0].extractedDigest = 'not-a-digest';

    expect(readyToApply(bad)).toMatchObject({ ok: false });
  });

  /*
    An empty extraction hashes to something perfectly stable, so it would pass
    every later run — a baseline that means "we successfully read nothing".
  */
  it('refuses an extraction that found no text', () => {
    const empty = complete();
    empty.baseline.pages[0].extractedChars = 0;

    const verdict = readyToApply(empty);

    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.blocked).toContain('NOTHING_EXTRACTED');
  });
});

/**
 * The two instruments have to agree, or a person has to say they looked at the
 * disagreement. Text diff is the verdict and vision corroborates; the case
 * worth catching is the one where they part company, because that is either a
 * page that is not what we think it is or an extraction that is wrong.
 */
describe('vision corroboration', () => {
  it('refuses when vision disagrees with the text verdict', () => {
    const disagreeing = complete();
    disagreeing.baseline.visionCorroboration = { agreesWithTextVerdict: false, notes: 'Screenshot shows a stub.' };

    const verdict = readyToApply(disagreeing);

    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.blocked).toContain('VISION_DISAGREES');
  });

  it('refuses when nothing corroborated the text at all', () => {
    const uncorroborated = complete();
    uncorroborated.baseline.visionCorroboration = null;

    expect(readyToApply(uncorroborated)).toMatchObject({ ok: false });
  });

  /*
    ACKNOWLEDGED, NOT OVERRIDDEN. A gate with no way past it gets worked around;
    one that requires naming the thing you are accepting leaves the acceptance
    in the record, next to the signature. A machine can write the code too — but
    it has to write it beside an attestation a person is putting their name to.
  */
  it('applies when a person has explicitly acknowledged the disagreement', () => {
    const acknowledged = complete();
    acknowledged.baseline.visionCorroboration = { agreesWithTextVerdict: false, notes: 'Table reflowed, words same.' };
    acknowledged.baseline.signOff = signed(READING_ATTESTATION, ['VISION_DISAGREES']);

    expect(readyToApply(acknowledged)).toMatchObject({ ok: true });
  });

  it('does not let an acknowledgement cover a different problem', () => {
    const wrongAck = complete();
    wrongAck.baseline.pages[0].extractedChars = 0;
    wrongAck.baseline.signOff = signed(READING_ATTESTATION, ['VISION_DISAGREES']);

    expect(readyToApply(wrongAck)).toMatchObject({ ok: false });
  });

  /*
    An unsigned package cannot acknowledge its way through. The acknowledgement
    lives on the signature, so without one there is nothing to carry it.
  */
  it('does not let acknowledgements substitute for a signature', () => {
    const unsigned = complete();
    unsigned.baseline.visionCorroboration = { agreesWithTextVerdict: false, notes: '' };
    unsigned.baseline.signOff = null;

    expect(readyToApply(unsigned)).toMatchObject({ ok: false });
  });
});

/**
 * The note has to stop being true the moment it stops being true.
 *
 * `apply` first wrote the digests and left the sidecar `note` alone, so
 * Texas's entry read "URL from this file's own header. No baseline confirmed
 * yet." beside a URL that came from research and a digest a person had just
 * signed. Both clauses false, in the one file whose entire job is saying where
 * things came from. Caught by reading the diff.
 */
describe('sidecarEntryFor — what gets written next to the digest', () => {
  it('records that the page was identified rather than inherited, and when', () => {
    const entry = sidecarEntryFor(complete());

    expect(entry.pages).toEqual([
      {
        url: 'https://tcss.legis.texas.gov/resources/FI/htm/FI.398.htm',
        digest: 'a'.repeat(64),
      },
    ]);
    expect(entry.note).toContain('2026-09-19');
    expect(entry.note).not.toContain('No baseline confirmed yet');
  });

  /*
    The superseded URL is kept, because "this is not where the text came from"
    is the most surprising thing about the entry and deleting it would make the
    record quieter and less true.
  */
  it('keeps the URL it replaced, so the change is legible', () => {
    const entry = sidecarEntryFor(complete());

    expect(entry.note).toContain('capitol.texas.gov');
  });

  it('does not claim a page was superseded when it was the recorded one', () => {
    const same = complete();
    same.pageIdentification.recordedPages = [
      { url: 'https://tcss.legis.texas.gov/resources/FI/htm/FI.398.htm', provenance: 'header' },
    ];

    expect(sidecarEntryFor(same).note).not.toContain('supersedes');
  });
});

/**
 * FOUND BY AN INDEPENDENT AUDIT, and the most serious defect in this file.
 *
 * The acknowledgement filter subtracted EVERY named reason, including the
 * signature failures — so `acknowledged: ['READING_ATTESTATION_WRONG']` beside
 * a signature reading "looks fine to me" applied cleanly. The gate was
 * bypassable by anything that could write JSON, which is precisely what
 * demanding an exact attestation sentence was supposed to prevent.
 *
 * The test above it, "does not let acknowledgements substitute for a
 * signature", set `signOff` to null — so `acknowledged` was empty and the
 * subtraction never ran. It tested the adjacent case and read as coverage.
 *
 * A waiver is for a judgement a person made about the EVIDENCE. It was never
 * meant to waive the requirement that a person be there at all.
 */
describe('signature failures cannot be acknowledged away', () => {
  const withAck = (confirms: string, acknowledged: string[]) => {
    const pkg = complete();
    pkg.baseline.signOff = { by: 'x', at: '2026-09-19', confirms, acknowledged };

    return pkg;
  };

  it('refuses a wrong reading attestation that names its own failure code', () => {
    const verdict = readyToApply(withAck('looks fine to me', ['READING_ATTESTATION_WRONG']));

    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.blocked).toContain('READING_ATTESTATION_WRONG');
  });

  it('refuses a wrong page-identification attestation acknowledged from the reading signature', () => {
    const pkg = complete();
    pkg.pageIdentification.signOff = { by: 'x', at: '2026-09-19', confirms: 'nope' };
    pkg.baseline.signOff = {
      by: 'x',
      at: '2026-09-19',
      confirms: READING_ATTESTATION,
      acknowledged: ['PAGE_IDENTIFICATION_ATTESTATION_WRONG'],
    };

    expect(readyToApply(pkg)).toMatchObject({ ok: false });
  });

  it('refuses when both attestations are wrong and both codes are acknowledged', () => {
    const pkg = withAck('nope', ['READING_ATTESTATION_WRONG', 'PAGE_IDENTIFICATION_ATTESTATION_WRONG']);
    pkg.pageIdentification.signOff = { by: 'x', at: '2026-09-19', confirms: 'also nope' };

    expect(readyToApply(pkg)).toMatchObject({ ok: false });
  });

  it('still lets an evidence judgement be acknowledged', () => {
    // The waiver exists for what a person decided about the evidence, and that
    // still works — it is only the presence of the person that cannot be waived.
    const pkg = complete();
    pkg.baseline.visionCorroboration = { agreesWithTextVerdict: false, notes: 'Table reflowed, words identical.' };
    pkg.baseline.signOff = {
      by: 'repository owner',
      at: '2026-09-19',
      confirms: READING_ATTESTATION,
      acknowledged: ['VISION_DISAGREES'],
    };

    expect(readyToApply(pkg)).toMatchObject({ ok: true });
  });
});

/**
 * `agreesWithTextVerdict` had nothing to agree with.
 *
 * The script never produced a comparison — `fetch` extracts and hashes and
 * stops — while the skill told people "the text diff is the verdict". So the
 * vision field could record agreement with an artifact that did not exist, and
 * a confident visual reading would look like a completed verification. Also
 * found by the audit.
 */
describe('vision corroborates a comparison that has to exist', () => {
  it('refuses a package with no text comparison at all', () => {
    const pkg = complete();
    pkg.baseline.textComparison = null;

    const verdict = readyToApply(pkg);

    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.blocked).toContain('NO_TEXT_COMPARISON');
  });

  it('refuses a comparison that does not say how it was made', () => {
    const pkg = complete();
    pkg.baseline.textComparison = { method: '', verdict: 'equivalent', findings: 'looks right' };

    expect(readyToApply(pkg)).toMatchObject({ ok: false });
  });

  /*
    A comparison that found a difference is not a reason to refuse — the stored
    file and the published page are often different publications of the same
    law. It has to be STATED, and then a person decides.
  */
  it('applies when a stated difference has been signed for', () => {
    const pkg = complete();
    pkg.baseline.textComparison = {
      method: 'Operative provisions of §10-1-393.18 compared subsection by subsection.',
      verdict: 'differs',
      findings: 'The stored bill carries unrelated Part 2 provisions the codified section does not.',
    };
    pkg.baseline.signOff = {
      by: 'repository owner',
      at: '2026-09-19',
      confirms: READING_ATTESTATION,
      acknowledged: ['TEXT_COMPARISON_DIFFERS'],
    };

    expect(readyToApply(pkg)).toMatchObject({ ok: true });
  });

  it('refuses an unacknowledged difference', () => {
    const pkg = complete();
    pkg.baseline.textComparison = { method: 'm', verdict: 'differs', findings: 'f' };

    expect(readyToApply(pkg)).toMatchObject({ ok: false });
  });
});

/** Evidence has to be attached, not merely described. */
describe('screenshot evidence', () => {
  it('refuses a page with no screenshot recorded', () => {
    const pkg = complete();
    pkg.baseline.pages[0].screenshot = null;

    const verdict = readyToApply(pkg);

    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.blocked).toContain('NO_SCREENSHOT');
  });
});

/**
 * A package is a JSON file a person edits by hand, so it will be malformed —
 * a missing field, an older shape, a typo. The gate has to REFUSE those, not
 * throw on them.
 *
 * `textComparison === null` was false for a package written before the field
 * existed, where it is `undefined`, and reading `.method` off it threw a
 * TypeError out of `readyToApply`. A gate that crashes has not said no; it has
 * said nothing, and a caller that catches would be free to read that as
 * anything at all. Found by running `apply` against the first package ever
 * written.
 */
describe('a malformed or older package is refused, never thrown on', () => {
  const stripped = (drop: (pkg: BaselinePackage) => void): BaselinePackage => {
    const pkg = complete();
    drop(pkg);

    return pkg;
  };

  it('refuses a package written before textComparison existed', () => {
    const old = stripped((pkg) => {
      delete (pkg.baseline as { textComparison?: unknown }).textComparison;
    });

    expect(() => readyToApply(old)).not.toThrow();
    expect(readyToApply(old)).toMatchObject({ ok: false });
  });

  it('refuses a package with no baseline section at all', () => {
    const wrecked = { file: 'x.txt', mode: 'baseline', generatedAt: '2026-09-19' } as unknown as BaselinePackage;

    expect(() => readyToApply(wrecked)).not.toThrow();
    expect(readyToApply(wrecked)).toMatchObject({ ok: false });
  });

  it('refuses a package whose pages are missing', () => {
    const noPages = stripped((pkg) => {
      delete (pkg.baseline as { pages?: unknown }).pages;
    });

    expect(() => readyToApply(noPages)).not.toThrow();
    expect(readyToApply(noPages)).toMatchObject({ ok: false });
  });

  it('refuses an entirely empty object', () => {
    expect(() => readyToApply({} as BaselinePackage)).not.toThrow();
    expect(readyToApply({} as BaselinePackage)).toMatchObject({ ok: false });
  });
});
