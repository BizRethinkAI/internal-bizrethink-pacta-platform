import { readSourceText, sourceExists } from './source-text';

/**
 * Where a vendored file's text came from, read out of the file itself.
 *
 * THE DEFECT THIS EXISTS FOR. Georgia's spec carried `verbatimVerifiedAt`
 * against a browser capture of law.justia.com — a publisher that reproduces the
 * Code rather than enacting it — and that capture was incomplete: subsection
 * (a)'s definitions were absent, so "advance fee", the term the broker
 * prohibition in (f)(1) turns on, was defined nowhere in what we held. The
 * digest over it matched on every run, because a digest is a faithful record of
 * whatever it is taken over. On `/admin/mca` that state's card was
 * indistinguishable from California's.
 *
 * The file said where it came from in its own header. Nothing read the header.
 *
 * WHY THIS IS DERIVED AND NOT DECLARED. The obvious fix is a `sourceStrength:
 * 'official'` field on the spec. That is the same defect one level up: a claim
 * with nothing re-executing it, which is exactly what a verification date is
 * without `verifyProvenance`. So the classification is taken from the bytes in
 * `mca/sources/` on every run, and a re-vendoring that drops the header changes
 * the answer without anybody editing a spec.
 *
 * WHAT IT CANNOT TELL YOU, which is most of it:
 *
 *   - It reads what a file SAYS about its own origin. A header naming an
 *     official publisher and lying is indistinguishable from one telling the
 *     truth. What it narrows is the question — from "is this the law" to "did
 *     anyone record where this came from" — and Georgia failed the second.
 *   - It says nothing about whether the copy is COMPLETE. The Georgia capture
 *     was both secondary and truncated, and truncation is the part that made it
 *     dangerous. Nothing here would have caught a complete capture from a
 *     secondary publisher, and nothing here catches a truncated one from an
 *     official publisher. `checkAgainstSource` is what notices missing text,
 *     and only for text a spec already claims.
 *   - It says nothing about STALENESS. See `reading-age.ts`; when a regulator
 *     amends a rule this file does not move.
 */

/**
 * How far into the file the vendoring header can reach.
 *
 * The same forty lines `sources-are-primary.test.ts` reads, and for the reason
 * given there: matching the whole file would classify a statute that happens to
 * discuss a publisher in its own text. Kept at the top of a file because that is
 * where every vendoring header in `sources/` actually is.
 */
export const HEADER_LINES = 40;

/**
 * Publishers that reproduce a statute rather than enact or codify it.
 *
 * One list, exported, because there were two: this and the copy inside
 * `sources-are-primary.test.ts`, which is the file that would go green while
 * this one went wrong.
 */
export const SECONDARY_PUBLISHERS: readonly RegExp[] = [
  /justia/i,
  /casetext/i,
  /findlaw/i,
  /lawserver/i,
  /anylaw/i,
  /openjurist/i,
  /courtlistener/i,
];

/**
 * A URL that is a government publisher's.
 *
 * A URL rather than prose: "published by the Georgia General Assembly" is a
 * sentence anybody can write, and the host that served the bytes is a fact
 * about the retrieval. `.gov` covers legislatures, codifiers and the two
 * financial regulators whose regulations we hold; `.state.xx.us` covers the
 * older state hosts.
 *
 * kslegislature.org is here because Kansas's own legislature publishes from a
 * `.org`, and a domain rule that quietly downgraded a state for its choice of
 * TLD would be a rule people work around. It is the one entry that is a claim
 * rather than a pattern, and the next such state adds a line beside it.
 */
const OFFICIAL_PUBLISHERS: readonly RegExp[] = [
  /https?:\/\/[^\s]*\.gov(?:[/:?#]|\b)/i,
  /https?:\/\/[^\s]*\.state\.[a-z]{2}\.us(?:[/:?#]|\b)/i,
  /https?:\/\/[^\s]*\bkslegislature\.org(?:[/:?#]|\b)/i,
];

/**
 * The words that make a paragraph a claim about where the text came from.
 *
 * Deliberately narrow. A header may DISCUSS a source it replaced — the Georgia
 * file's own paragraph about the justia capture it superseded is the most
 * valuable prose in `sources/` — and a classifier that read every mention of a
 * publisher would force that paragraph to be deleted to keep the check green.
 * Deleting the record of a defect to satisfy a checker is the move this package
 * exists to make impossible.
 */
const RETRIEVAL_CLAIM = /\b(retrieved|vendored|downloaded|published by)\b|\bsource:/i;

/**
 * A structured `Publisher:` / `Site:` block, which beats prose and is read first.
 *
 * WHY THIS EXISTS. Seven sources were given headers in the PR that landed
 * beside this one, in the form
 *
 *     Publisher: California Department of Financial Protection and Innovation
 *     Site:      https://dfpi.ca.gov
 *
 * and the prose reader above got them wrong — for an instructive reason. Those
 * headers explain, in words, why they say "Publisher" and *not* "Retrieved
 * from", and `RETRIEVAL_CLAIM` matched the word `retrieved` inside that
 * explanation. So the classifier read a paragraph ABOUT the absence of a
 * retrieval claim AS the retrieval claim, and reported "names no publisher"
 * about a file whose next line names one.
 *
 * A keyword search over prose will always be able to do that. A structured
 * block cannot be triggered by discussion of itself, which is why it is checked
 * first and why the answer it gives wins.
 */
const PUBLISHER_BLOCK = /^\s*Publisher:\s*(.+)$/im;
const SITE_BLOCK = /^\s*Site:\s*(\S+)/im;

export type SourceOrigin =
  /** The header records a retrieval from the publisher that enacted or codified the text. */
  | 'official-publisher'
  /** Nothing in the file records where its text was retrieved from. */
  | 'origin-not-recorded'
  /** The header records a retrieval from a publisher that reproduces the law. */
  | 'secondary-publisher';

export type OriginFinding = {
  origin: SourceOrigin;
  /** The retrieval statement the verdict was taken from. Null when there is none. */
  evidence: string | null;
  /** Why it got that verdict. Never empty — a verdict with no reason is a tick. */
  why: string;
};

const quote = (block: string): string => {
  const flat = block.replace(/\s+/g, ' ').trim();

  return flat.length > 200 ? `${flat.slice(0, 199)}…` : flat;
};

/**
 * Every paragraph of the header that claims a retrieval.
 *
 * Paragraphs rather than lines: a retrieval statement is regularly wrapped
 * across three of them, with the URL on its own — Georgia's names the publisher
 * on one line, the URL on the next and the date on the third — and a
 * line-at-a-time reader sees a bare URL with no claim attached to it.
 */
const retrievalClaims = (text: string): string[] =>
  text
    .split('\n')
    .slice(0, HEADER_LINES)
    .join('\n')
    .split(/\n\s*\n/)
    .filter((block) => RETRIEVAL_CLAIM.test(block));

const matches = (patterns: readonly RegExp[], block: string): boolean => patterns.some((p) => p.test(block));

/**
 * Classify a file's text.
 *
 * TAKES THE WEAKEST CLAIM IN THE HEADER, NOT THE FIRST. A file vendored twice
 * records both retrievals, and the weaker one is the one that decides what we
 * are holding: if half a statute came from a secondary publisher, the file did.
 */
export const originOf = (text: string): OriginFinding => {
  const header = text.split('\n').slice(0, HEADER_LINES).join('\n');
  const publisher = header.match(PUBLISHER_BLOCK)?.[1]?.trim();
  const site = header.match(SITE_BLOCK)?.[1]?.trim();

  /*
    THE STRUCTURED BLOCK IS READ FIRST AND ITS ANSWER WINS.

    It is stronger evidence than a sentence and it cannot be confused by a
    header that discusses its own provenance, which is exactly how the prose
    reader below misclassified seven files. It is still checked against the same
    two lists: naming a reproducer here is no better than naming one in prose.
  */
  if (publisher !== undefined && site !== undefined) {
    const block = `${publisher} ${site}`;

    if (matches(SECONDARY_PUBLISHERS, block)) {
      return {
        origin: 'secondary-publisher',
        evidence: quote(block),
        why: 'the header names a publisher that reproduces the law rather than enacting or codifying it',
      };
    }

    if (matches(OFFICIAL_PUBLISHERS, block)) {
      return {
        origin: 'official-publisher',
        evidence: quote(block),
        why: 'the header names the publisher that enacted or codified the text, and its own site',
      };
    }

    return {
      origin: 'origin-not-recorded',
      evidence: quote(block),
      why: 'the header names a publisher but not a site belonging to one, so the claim rests on prose alone',
    };
  }

  const claims = retrievalClaims(text);

  if (claims.length === 0) {
    return {
      origin: 'origin-not-recorded',
      evidence: null,
      why:
        'the file records no retrieval at all, so nothing in it distinguishes the official publisher’s copy from a ' +
        'reproduction — which is the state Georgia’s source was in',
    };
  }

  const secondary = claims.find((block) => matches(SECONDARY_PUBLISHERS, block));

  if (secondary !== undefined) {
    return {
      origin: 'secondary-publisher',
      evidence: quote(secondary),
      why:
        'the retrieval names a publisher that reproduces the law rather than enacting or codifying it; Georgia’s ' +
        'did, and that copy was missing subsection (a) entirely',
    };
  }

  const official = claims.find((block) => matches(OFFICIAL_PUBLISHERS, block));

  if (official !== undefined) {
    return {
      origin: 'official-publisher',
      evidence: quote(official),
      why: 'the header records a retrieval from the publisher that enacted or codified the text',
    };
  }

  return {
    origin: 'origin-not-recorded',
    evidence: quote(claims[0] ?? ''),
    why:
      'the header records where our copy came from but names no publisher — a copy of a copy is not the ' +
      'publisher’s own',
  };
};

/**
 * The same question, asked of a file in `mca/sources/`.
 *
 * DEGRADES RATHER THAN THROWS when the file is absent, for the reason
 * `source-text.ts` gives at length: the production image does not copy
 * `mca/sources/`, so in the container every source is missing and this runs on
 * every request. A page that 500s there would tell a reader nothing; a page
 * that says the evidence is not present tells them the truth.
 */
export const originOfSource = (file: string): OriginFinding => {
  if (!sourceExists(file)) {
    return {
      origin: 'origin-not-recorded',
      evidence: null,
      why: `${file} is not in mca/sources/, so there is no header to read and no origin to record`,
    };
  }

  return originOf(readSourceText(file));
};
