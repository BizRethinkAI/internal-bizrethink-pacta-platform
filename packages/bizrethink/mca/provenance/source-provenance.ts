import { HEADER_LINES } from './source-origin';

/**
 * What a vendored source records about where it came from.
 *
 * ADR 0025 §3 defers a monthly job that compares each official source with our
 * stored copy, and says it must "be able to say, per source, when it was last
 * successfully compared". Neither is possible while the answer lives in prose:
 * no file records a URL it could be re-fetched from, and only five of twenty
 * record a date.
 *
 * This extends the `Publisher:` / `Site:` block that already exists rather than
 * inventing a second convention, and for the reason `source-origin.ts` records
 * at length — a keyword search over prose read a paragraph *about* the absence
 * of a retrieval claim *as* the retrieval claim. A structured block cannot be
 * triggered by discussion of itself.
 *
 *     Publisher: California Department of Financial Protection and Innovation
 *     Site:      https://dfpi.ca.gov
 *     Retrieved: https://dfpi.ca.gov/.../10-CCR-900-956.pdf
 *     Recorded:  2026-09-08
 *
 * `Retrieved:` is what decides whether the monthly job can check a source by
 * itself or has to ask a person to go and look.
 */

export type SourceProvenance = {
  /** Who published the text. */
  publisher: string | null;
  /** The publisher's site, which is where a person starts looking. */
  site: string | null;
  /** A URL this copy can be re-fetched from. Null means a person has to look. */
  retrievedFrom: string | null;
  /** ISO date the copy was last compared with its source. */
  recordedOn: string | null;
  /**
   * What the PUBLISHED PAGE hashed to when it was last read.
   *
   * The comparison cannot be our copy against the page: ours is extracted text
   * with a header we wrote, theirs is HTML. Those never match, and a check that
   * reports a difference every month is one nobody reads. So the question is
   * "has the page moved since a person last confirmed it", and this is the
   * answer to compare against.
   */
  sourceDigest: string | null;
};

/**
 * Read only the header.
 *
 * A statute quoting "Recorded:" in its own body — recording fees, recorded
 * instruments, a UCC filing — must not become the file's provenance. Same
 * window `source-origin.ts` uses, so the two agree about where a header ends.
 */
const headerOf = (text: string) => text.split('\n').slice(0, HEADER_LINES).join('\n');

const field = (header: string, name: string): string | null =>
  header.match(new RegExp(`^\\s*${name}:\\s*(.+)$`, 'im'))?.[1]?.trim() ?? null;

/**
 * An http(s) URL or nothing.
 *
 * A value that is not a URL is worse than an absent one: it would put the file
 * in the job's automatic column and fail there every month, which is the
 * "silently stops running" failure ADR 0025 §3 asks to avoid.
 */
const urlOrNull = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }

  try {
    const parsed = new URL(value);

    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
};

/** ISO `YYYY-MM-DD`, and a real day — not `2026-13-45`. */
const isoDateOrNull = (value: string | null): string | null => {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : value;
};

export const sourceProvenance = (text: string): SourceProvenance => {
  const header = headerOf(text);

  return {
    publisher: field(header, 'Publisher'),
    site: field(header, 'Site'),
    retrievedFrom: urlOrNull(field(header, 'Retrieved')),
    recordedOn: isoDateOrNull(field(header, 'Recorded')),
    sourceDigest:
      field(header, 'SourceDigest')
        ?.match(/^[a-f0-9]{64}$/i)?.[0]
        ?.toLowerCase() ?? null,
  };
};
