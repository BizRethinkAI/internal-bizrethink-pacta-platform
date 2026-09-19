import { describe, expect, it } from 'vitest';

import {
  type BaselinePackage,
  PAGE_IDENTIFICATION_ATTESTATION,
  READING_ATTESTATION,
  readyToApply,
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
