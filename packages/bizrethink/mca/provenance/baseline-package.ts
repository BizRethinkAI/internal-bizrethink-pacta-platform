import { z } from 'zod';

/**
 * The package a person signs before a baseline is recorded.
 *
 * `sourceDigest` asserts "a person read this page and it is the statute we
 * stored". Everything leading up to that assertion is mechanical — fetch,
 * extract, digest, diff, screenshot — and none of it can make the assertion:
 * a machine taking its own baseline hashes the page against itself, which
 * would bless an amendment nobody had seen and then report green forever.
 *
 * So the sign-off is STRUCTURAL. If it were a convention, the first run would
 * be human-verified and every run after would quietly not be, and the baseline
 * would stop meaning what it says while still saying it.
 *
 * TWO SIGN-OFFS, BECAUSE THERE ARE TWO CLAIMS, and the first one is the one we
 * nearly missed. "Where the text came from" is not "where an amendment would
 * appear": `TX-Fin-Code-Ch-398.txt` is the enrolled HB 700 of 2025, a finished
 * document that will read the same in 2030, while an amendment to Chapter 398
 * appears in the codified chapter at `tcss.legis.texas.gov`. Baselining the
 * recorded URL gives a watch that reports `unchanged` every month and can never
 * fire. Roughly eleven of the twenty-six recorded pages have that shape.
 *
 * The same package serves both modes. `baseline` sets a digest where none
 * exists; `adjudicate` answers "is this flagged difference a real amendment or
 * a false positive" — the same evidence, the same signatures, so the procedure
 * that sets a baseline is the procedure that judges a change and the two cannot
 * drift apart.
 */

/**
 * The exact sentences a signature has to carry.
 *
 * A sentence rather than `signedOff: true`, because a boolean is set by
 * anything that can write JSON. A sentence that must match makes an
 * absent-minded or automated sign-off visible in the record, and states in the
 * record itself what was actually being claimed.
 */
export const PAGE_IDENTIFICATION_ATTESTATION =
  'I have confirmed this is the page where an amendment to this source would appear.';

export const READING_ATTESTATION = 'I have read this page and it is the source we stored.';

export type SignOff = {
  /** A role, not a personal name — these records are public. */
  by: string;
  /** ISO date the person signed. */
  at: string;
  /** Must equal the phase's attestation exactly. */
  confirms: string;
  /**
   * Blocking reasons this person has consciously accepted.
   *
   * A gate with no way past it gets worked around. One that makes you name what
   * you are accepting leaves the acceptance in the record, beside the
   * signature.
   */
  acknowledged?: string[];
};

export type BaselinePage = {
  url: string;
  /** After redirects — a legislature reorganising its site shows up here first. */
  finalUrl: string;
  httpStatus: number;
  contentType: string | null;
  extractedChars: number;
  /** `normalisedDigest` of the extracted text, computed at collection. */
  extractedDigest: string;
  /** Human-auditable evidence of what the page looked like. */
  screenshot: string | null;
};

export type BaselinePackage = {
  file: string;
  mode: 'baseline' | 'adjudicate';
  generatedAt: string;
  pageIdentification: {
    /** What the sidecar already records, and where each URL came from. */
    recordedPages: { url: string; provenance: string }[];
    /** Where an amendment would actually appear. Null until the question is answered. */
    amendmentAppearsAt: string[] | null;
    reasoning: string | null;
    signOff: SignOff | null;
  };
  baseline: {
    pages: BaselinePage[];
    /**
     * The comparison of the fetched page against our stored copy.
     *
     * REQUIRED, because `agreesWithTextVerdict` used to have nothing to agree
     * with: the script extracts and hashes and never compares, while the
     * procedure said "the text diff is the verdict". A vision field recording
     * agreement with an artifact that did not exist made a confident visual
     * reading look like a completed verification.
     *
     * `method` says how the comparison was made and is not optional, because
     * the stored file and the published page are frequently different
     * publications of the same law — a bill against a codified section — and
     * what counts as equivalent depends entirely on what was compared.
     * `differs` is a legitimate outcome; it has to be stated and signed for,
     * not avoided.
     */
    textComparison: { method: string; verdict: 'equivalent' | 'differs'; findings: string } | null;
    /**
     * Vision on the screenshot, against the text verdict.
     *
     * Corroboration, never the verdict: for statute text the authoritative
     * comparison is character-level, because the failure that matters is one
     * inserted "not" or a changed figure, and a vision reading paraphrases.
     * What it is good for is the thing a diff cannot see — whether the page is
     * the statute at all rather than a stub, a paywall or a consent gate.
     */
    visionCorroboration: { agreesWithTextVerdict: boolean; notes: string } | null;
    signOff: SignOff | null;
  };
};

export type ApplyVerdict = { ok: true; pages: { url: string; digest: string }[] } | { ok: false; blocked: string[] };

const SHA256 = /^[a-f0-9]{64}$/i;

/**
 * THE PACKAGE'S SHAPE, CHECKED BEFORE ANYTHING REASONS ABOUT IT.
 *
 * An earlier fix read every field through `??`, which handles a field that is
 * ABSENT and does nothing about one that is the wrong TYPE. An independent
 * audit walked straight through it: `{ method: 'x' }` with no verdict applied,
 * `verdict: 'maybe'` applied, and `method: 42`, `pages: {}` and a missing
 * nested `amendmentAppearsAt` each threw a TypeError out of the gate.
 *
 * Patching those would leave a fourth. A package is a JSON file a person edits
 * by hand, so its shape is exactly what a schema is for — and everything else
 * in this package is validated with zod. Parsing first removes the class.
 *
 * `.passthrough()` rather than `.strict()`: an unknown field is a package from
 * a newer version of this tool, which is not a reason to refuse a baseline a
 * person has signed.
 */
const ZSignOff = z
  .object({
    by: z.string().min(1),
    at: z.string().min(1),
    confirms: z.string(),
    acknowledged: z.array(z.string()).optional(),
  })
  .passthrough();

const ZBaselinePackage = z
  .object({
    file: z.string().min(1),
    mode: z.enum(['baseline', 'adjudicate']),
    generatedAt: z.string().min(1),
    pageIdentification: z
      .object({
        recordedPages: z.array(z.object({ url: z.string(), provenance: z.string() }).passthrough()),
        amendmentAppearsAt: z.array(z.string().min(1)).nullable(),
        reasoning: z.string().nullable(),
        signOff: ZSignOff.nullable(),
      })
      .passthrough(),
    baseline: z
      .object({
        pages: z.array(
          z
            .object({
              url: z.string().min(1),
              finalUrl: z.string().min(1),
              httpStatus: z.number(),
              contentType: z.string().nullable(),
              extractedChars: z.number(),
              extractedDigest: z.string(),
              /*
                EVIDENCE, NOT A NOTE. The screenshot is the only instrument that
                catches a page which is a consent gate, a stub, or the wrong
                heading entirely — the audit caught a Missouri capture showing
                §40.405 above the commercial-financing body. A blank path is no
                evidence, so it is refused like a missing one.
              */
              screenshot: z.string().trim().min(1).nullable(),
            })
            .passthrough(),
        ),
        /*
          A verdict and findings, not just a method. Requiring one non-blank
          sentence does not establish that a comparison happened; the audit's
          words for what that produces are "vague comparison paperwork".
        */
        textComparison: z
          .object({
            method: z.string().trim().min(1),
            verdict: z.enum(['equivalent', 'differs']),
            findings: z.string().trim().min(1),
          })
          .passthrough()
          .nullable(),
        visionCorroboration: z
          .object({ agreesWithTextVerdict: z.boolean(), notes: z.string() })
          .passthrough()
          .nullable(),
        signOff: ZSignOff.nullable(),
      })
      .passthrough(),
  })
  .passthrough();

/**
 * Reasons an acknowledgement can never clear.
 *
 * The filter used to subtract every named reason, so
 * `acknowledged: ['READING_ATTESTATION_WRONG']` beside a signature reading
 * "looks fine to me" applied cleanly — the gate was bypassable by anything
 * that could write JSON, which is exactly what demanding an exact attestation
 * sentence was meant to prevent. Found by an independent audit of the
 * procedure; the test that looked like it covered this set `signOff` to null,
 * so the subtraction never ran.
 *
 * A waiver is for a judgement a person made about the EVIDENCE. It was never
 * meant to waive the requirement that a person be there at all.
 */
const NON_WAIVABLE = new Set([
  'PAGE_IDENTIFICATION_NOT_SIGNED',
  'PAGE_IDENTIFICATION_ATTESTATION_WRONG',
  'READING_NOT_SIGNED',
  'READING_ATTESTATION_WRONG',
]);

const signedWith = (signOff: SignOff | null, attestation: string): boolean =>
  signOff !== null && signOff.confirms === attestation;

/**
 * Everything that has to be true before a digest is written into
 * `provenance.json`.
 *
 * Returns every reason at once rather than the first. A gate that reveals one
 * problem per run teaches people to re-run rather than to read, and the whole
 * point of the package is that it is read.
 */
export const readyToApply = (pkg: BaselinePackage): ApplyVerdict => {
  const blocked: string[] = [];

  /*
    PARSE, THEN REASON. A gate that crashes has not said no — it has said
    nothing, and a caller that catches would be free to read that as anything.
  */
  const parsed = ZBaselinePackage.safeParse(pkg);

  if (!parsed.success) {
    /*
      Reported as ONE reason with the paths, rather than as a pile of missing
      signatures. A malformed package is a different problem from an unsigned
      one and sending somebody to sign it would be the wrong instruction.
    */
    return {
      ok: false,
      blocked: [
        'PACKAGE_MALFORMED',
        ...parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`),
      ],
    };
  }

  const { pageIdentification: identification, baseline } = parsed.data;
  const pages = baseline.pages;
  const textComparison = baseline.textComparison;
  const visionCorroboration = baseline.visionCorroboration;

  if (!signedWith(identification.signOff ?? null, PAGE_IDENTIFICATION_ATTESTATION)) {
    blocked.push(
      (identification.signOff ?? null) === null
        ? 'PAGE_IDENTIFICATION_NOT_SIGNED'
        : 'PAGE_IDENTIFICATION_ATTESTATION_WRONG',
    );
  }

  if (!signedWith(baseline.signOff ?? null, READING_ATTESTATION)) {
    blocked.push((baseline.signOff ?? null) === null ? 'READING_NOT_SIGNED' : 'READING_ATTESTATION_WRONG');
  }

  const identified = identification.amendmentAppearsAt;

  if (identified === null || identified.length === 0) {
    blocked.push('NO_PAGE_IDENTIFIED');
  } else {
    /*
      Phase one decides which pages get watched, so the pages fetched have to be
      those pages. A package that identified the codified chapter and then
      baselined the enrolled bill would record a digest for a document that can
      never change, under a signature saying otherwise.
    */
    const fetched = pages.map((page) => page.url);
    const same = identified.length === fetched.length && identified.every((url) => fetched.includes(url));

    if (!same) {
      blocked.push('PAGES_NOT_THE_ONES_IDENTIFIED');
    }
  }

  if (pages.length === 0) {
    blocked.push('NOTHING_FETCHED');
  }

  for (const page of pages) {
    if (page.httpStatus !== 200) {
      blocked.push('PAGE_NOT_FETCHED_CLEANLY');
    }

    if (!SHA256.test(page.extractedDigest)) {
      blocked.push('DIGEST_NOT_A_SHA256');
    }

    /*
      An empty extraction hashes to something perfectly stable, so it would
      match on every later run — a baseline meaning "we successfully read
      nothing", reported as a statute that has not changed.
    */
    if (page.extractedChars === 0) {
      blocked.push('NOTHING_EXTRACTED');
    }

    /*
      Evidence attached, not merely described. The screenshot is the only
      record of what the page looked like on the day, and the one instrument
      that catches a page which is a consent gate or a navigation shell rather
      than the statute.
    */
    if (page.screenshot === null) {
      blocked.push('NO_SCREENSHOT');
    }
  }

  if (textComparison === null) {
    blocked.push('NO_TEXT_COMPARISON');
  } else if (textComparison.verdict === 'differs') {
    blocked.push('TEXT_COMPARISON_DIFFERS');
  }

  if (visionCorroboration === null) {
    blocked.push('NOT_CORROBORATED');
  } else if (!visionCorroboration.agreesWithTextVerdict) {
    blocked.push('VISION_DISAGREES');
  }

  /*
    Acknowledgements live on the READING signature, so an unsigned package
    cannot acknowledge its way through: the attestation check above has already
    blocked, and nothing here can clear it.
  */
  const acknowledged = new Set(baseline.signOff?.acknowledged ?? []);
  const remaining = [...new Set(blocked)].filter((reason) => NON_WAIVABLE.has(reason) || !acknowledged.has(reason));

  if (remaining.length > 0) {
    return { ok: false, blocked: remaining };
  }

  return { ok: true, pages: pages.map((page) => ({ url: page.url, digest: page.extractedDigest })) };
};

/**
 * What replaces the sidecar entry once a baseline is signed.
 *
 * `apply` used to write the digests and leave `note` alone, so Texas ended up
 * reading "URL from this file's own header. No baseline confirmed yet." beside
 * a URL that came from research and a digest a person had just signed — both
 * clauses false, in the one file whose entire job is saying where things came
 * from. A stale note is worse than no note, because it is read as current.
 *
 * The superseded URL is kept rather than dropped. "This is not where the text
 * came from" is the most surprising thing about such an entry, and a record
 * that quietly loses it is quieter and less true.
 *
 * The note it REPLACES is not carried forward. Quoting "No baseline confirmed
 * yet" inside the note that confirms a baseline reproduces the confusion this
 * exists to fix; what the entry used to say is git's job.
 */
export const sidecarEntryFor = (pkg: BaselinePackage): { pages: { url: string; digest: string }[]; note: string } => {
  const verdict = readyToApply(pkg);

  if (!verdict.ok) {
    throw new Error(`Refusing to build a sidecar entry for an unapplied package: ${verdict.blocked.join(', ')}`);
  }

  const confirmedOn = pkg.baseline.signOff?.at ?? pkg.generatedAt.slice(0, 10);
  const watched = new Set(verdict.pages.map((page) => page.url));
  const superseded = pkg.pageIdentification.recordedPages.map((page) => page.url).filter((url) => !watched.has(url));

  const note = [
    `Baseline confirmed ${confirmedOn} against the page where an amendment would appear.`,
    superseded.length > 0
      ? `Page identified by research, not inherited: supersedes the recorded retrieval ${superseded.join(', ')}, a finished document that could never change.`
      : 'Page identified as the one an amendment would appear on.',
  ].join(' ');

  return { pages: verdict.pages, note };
};
