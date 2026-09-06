import type { RenderedRow } from '../prescribed/types';

/**
 * The OTHER kind of disclosure statute.
 *
 * California and New York prescribe a form: exact rows, exact words, closed to
 * anything else. Nine states do not. They list the information a disclosure
 * must convey and leave the drafting to the provider — Florida's §559.9613(2)
 * is the type specimen, six lettered items and no prescribed sentence anywhere.
 *
 * These need the opposite check. For a prescribed form the danger is saying
 * something extra; here the danger is a required item having no home at all,
 * and no amount of verbatim matching will find that. A form can be beautifully
 * worded and silently missing paragraph (f).
 */
export type ContentRequirement = {
  /** e.g. 'Fla. Stat. §559.9613(2)(d)'. */
  citation: string;
  /** The obligation, in the statute's own terms. */
  requires: string;
  /**
   * The row of our form that carries it, matched against the rendered label.
   * Null means we have not placed it — a finding, not a TODO.
   */
  row: string | null;
  /**
   * Strings that must appear in that row for the requirement to be met.
   *
   * This is what makes the check bite. Florida §559.9613(2)(f) does not merely
   * want prepayment discussed; it wants "a reference to the provision in the
   * agreement which creates the contractual rights of the parties related to
   * prepayment". So "FRPA §8.3" is evidence, and deleting it fails a test
   * rather than quietly breaking the disclosure.
   */
  evidence: string[];
};

export type ContentStatute = {
  slug: string;
  citation: string;
  sourceFile: string;
  requirements: ContentRequirement[];
};

export type ContentGap = {
  citation: string;
  kind: 'unplaced' | 'row-missing' | 'evidence-missing';
  detail: string;
};

const norm = (s: string): string =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

/** Does our form actually carry every item the statute lists? */
export const checkContentCoverage = (
  statute: ContentStatute,
  rendered: RenderedRow[],
): ContentGap[] => {
  const gaps: ContentGap[] = [];

  for (const req of statute.requirements) {
    if (req.row === null) {
      gaps.push({
        citation: req.citation,
        kind: 'unplaced',
        detail: `${req.citation} is not carried by any row: ${req.requires}`,
      });
      continue;
    }

    const target = req.row;
    const row = rendered.find((r) => norm(r.label).includes(norm(target)));

    if (!row) {
      gaps.push({
        citation: req.citation,
        kind: 'row-missing',
        detail: `${req.citation} is assigned to row ${JSON.stringify(target)}, which the form does not have`,
      });
      continue;
    }

    const haystack = norm(`${row.label} ${row.value ?? ''} ${row.content}`);
    const absent = req.evidence.filter((e) => !haystack.includes(norm(e)));

    if (absent.length) {
      gaps.push({
        citation: req.citation,
        kind: 'evidence-missing',
        detail: `${req.citation}: row ${JSON.stringify(target)} is missing ${JSON.stringify(absent)}`,
      });
    }
  }

  return gaps;
};
