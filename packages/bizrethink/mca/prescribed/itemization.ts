import type { ClauseSource } from '../../provenance/types';
import type { ClauseStatus } from '../../server-only/feature-access';
import type { McaJurisdiction } from '../jurisdictions';
import { containsPrescribedText, norm, type SourceSection } from '../provenance/source-text';
import type { McaTransactionType } from '../transactions';

/**
 * The Itemization of Amount Financed — 10 CCR §956, 23 NYCRR §600.17.
 *
 * A SEPARATE TYPE AND A SEPARATE CHECKER, and the separation is the point of
 * this file. It would have been half the code to give `PrescribedForm` two more
 * flags and reuse `checkFormConformity`, and it would have been wrong three
 * times over:
 *
 *   1. §956(a) requires a document "substantially similar in form to the
 *      example disclosure … INCLUDING AT A MINIMUM" six items. There is no
 *      prescribed line count. `checkFormConformity` opens with a row-count
 *      comparison, which would fire on every correct itemization.
 *   2. §956(a)(3) puts each third-party payee on its own line. The number of
 *      lines is therefore a fact about the DEAL, and positional alignment —
 *      spec row i against rendered row i — is wrong the moment a deal has two
 *      payees. What the regulation actually prescribes is an ordered
 *      subsequence, which is what this checker looks for.
 *   3. No line is closed with "shall include only". §956(c)(4) expressly
 *      permits a description of the assumptions used, BELOW the required items,
 *      so `unauthorised-addition` has nothing to mean here. Extra content is
 *      lawful by the regulation's own terms and is accepted by construction.
 *
 * One more difference, which reads as an omission in our documents until you
 * know the reason: §956(c)(3) and §600.17(c)(3) say the disclosure "need not be
 * signed by the recipient", and neither Lombard itemization carries a signer
 * placeholder. That is correct, not missing.
 *
 * AND ONE THING NO TABLE HAS. §956(a)(4) and (a)(6) require the two computed
 * lines to carry "a reference to how the amount was calculated" — "(Sum of
 * Items 1-3)", "(Item 4 minus Item 5)". Those references name LINE POSITIONS,
 * so adding a payee line silently invalidates both of them, on a document whose
 * whole purpose is to show the reader a subtraction. `cross-reference` is the
 * check for it and it is the reason this file exists at all.
 *
 * WHAT IT DOES NOT DO. It never looks at an amount. The numbers on a filled
 * itemization are `instance/identities.ts`'s job — `itemization-internal` and
 * `itemization-agreement` are already there — and duplicating them here would
 * produce two checkers that drift with no principled way to say which is right.
 * Structure here, arithmetic there.
 */
export type ItemizationLine = {
  /** Stable handle, so a cross-reference can name a line rather than an index. */
  id: string;
  /**
   * The description the regulation prescribes for this line, e.g. "Amount Given
   * Directly to You".
   *
   * Null where the regulation REQUIRES a line and words nothing — §956(a)(3)'s
   * third-party payee lines, where the obligation is to list each payee on a
   * separate line and identify them, and the wording is ours. A null
   * description is not a wildcard: the checker skips it entirely rather than
   * letting it match, because a wildcard would let an unworded line be consumed
   * in place of a prescribed one and hide a real omission.
   */
  description: string | null;
  /** The paragraph that compels the line, e.g. '10 CCR §956(a)(4)'. */
  citation: string;
  /**
   * The cross-reference the regulation requires this line to carry, expressed
   * as what it must be TRUE of rather than as a literal string — the literal
   * differs per deal because it names line numbers.
   *
   * 'sum-of-preceding': §956(a)(4) / §600.17(a)(4), "the sum of the amounts
   * described in paragraphs (a)(1), (2) and (3)". Every line above it, and
   * nothing else.
   *
   * 'difference': §956(a)(6) / §600.17(a)(6), the amount financed. Names the
   * two lines it is computed from, by id.
   */
  reference: null | { kind: 'sum-of-preceding' } | { kind: 'difference'; minuend: string; subtrahend: string };
};

export type ItemizationForm = {
  slug: string;
  citation: string;
  jurisdiction: McaJurisdiction;
  transaction: McaTransactionType;
  source: ClauseSource;
  status: ClauseStatus;
  sourceDigest: string;
  section: SourceSection | null;
  sourceFile: string;
  /**
   * As for `PrescribedForm`, required with no default.
   *
   * Both itemizations get 'source-order' and can afford to: §956(a)(1)–(6)
   * enumerate the lines in the order they appear, and §956(b) then prints two
   * worked examples in the same order. That is unlike §914, whose prose
   * introduces the Estimated Monthly Cost row last though the row is fifth — so
   * here the machine really can re-check the order rather than resting on a
   * human having done it once.
   */
  structureEvidence: 'source-order' | 'prose-described';
  lines: ItemizationLine[];
};

/** One line as read back off the built document. */
export type RenderedItem = {
  /** The first column, e.g. '1.' — the itemization numbers its lines. */
  number: string;
  /** The second column: the prescribed description plus whatever it is followed by. */
  description: string;
  /** The third column. Never inspected here; see `instance/`. */
  amount: string;
};

export type ItemizationDivergence = {
  kind: 'missing-line' | 'out-of-order' | 'numbering' | 'cross-reference' | 'not-in-source';
  /** Index into the SPEC's lines, or null for a whole-document problem. */
  line: number | null;
  detail: string;
};

/**
 * The line numbers named inside a cross-reference.
 *
 * The regulation writes the same reference two ways in the same section — the
 * §956(a)(4) instruction says "Sum of Items 1-7" and the §956(b)(1) example
 * says "(1+2+3)" — so both a range and a list have to parse. Only the LAST
 * parenthetical is read: "Amount Paid on your Account with Us (#XXXXX)" also
 * carries brackets, and it carries an account number rather than arithmetic.
 */
const referencedNumbers = (description: string): number[] => {
  const groups = [...norm(description).matchAll(/\(([^)]*)\)/g)];
  const last = groups.at(-1)?.[1];

  if (last === undefined) {
    return [];
  }

  const out: number[] = [];

  for (const token of last.matchAll(/(\d+)(?:\s*-\s*(\d+))?/g)) {
    const from = Number(token[1]);
    const to = token[2] === undefined ? from : Number(token[2]);

    if (to >= from) {
      for (let n = from; n <= to; n += 1) {
        out.push(n);
      }
    } else {
      out.push(from, to);
    }
  }

  return out;
};

const sameNumbers = (a: number[], b: number[]): boolean => a.length === b.length && a.every((n, i) => n === b[i]);

/**
 * Does the document we built match the itemization the regulation prescribes?
 *
 * The prescribed descriptions must appear in the prescribed ORDER, with any
 * number of other lines between them — the "at a minimum" reading — and the two
 * computed lines must reference the lines they are actually computed from.
 */
export const checkItemization = (form: ItemizationForm, rendered: RenderedItem[]): ItemizationDivergence[] => {
  const out: ItemizationDivergence[] = [];

  rendered.forEach((item, i) => {
    if (Number(item.number.replace(/\D/g, '')) !== i + 1) {
      out.push({
        kind: 'numbering',
        line: null,
        detail: `line ${i + 1} is numbered ${JSON.stringify(item.number)}; the itemization's cross-references name line numbers, so they must run consecutively from 1`,
      });
    }
  });

  /*
    A forward scan, not a set of positions. "Amount Financed" is a substring of
    nothing else here, but "Amount Provided to You or on Your Behalf" and
    "Amount Paid on your Account with Us" both begin "Amount P", and a scan that
    restarts from zero would happily match a later line to an earlier
    obligation and call a reordered document conforming.
  */
  const matched = new Map<string, number>();
  let cursor = 0;

  form.lines.forEach((spec, i) => {
    if (spec.description === null) {
      return;
    }

    const at = rendered.findIndex(
      (item, j) => j >= cursor && containsPrescribedText(item.description, spec.description as string),
    );

    if (at === -1) {
      const anywhere = rendered.some((item) => containsPrescribedText(item.description, spec.description as string));

      out.push({
        kind: anywhere ? 'out-of-order' : 'missing-line',
        line: i,
        detail: anywhere
          ? `${spec.citation} prescribes ${JSON.stringify(spec.description)}, which appears on the document but before a line that must precede it`
          : `${spec.citation} prescribes ${JSON.stringify(spec.description)}, which does not appear on the document`,
      });

      return;
    }

    matched.set(spec.id, at);
    cursor = at + 1;
  });

  form.lines.forEach((spec, i) => {
    const at = matched.get(spec.id);

    if (spec.reference === null || at === undefined) {
      return;
    }

    const named = referencedNumbers(rendered[at]?.description ?? '');
    const expected =
      spec.reference.kind === 'sum-of-preceding'
        ? Array.from({ length: at }, (_, n) => n + 1)
        : [matched.get(spec.reference.minuend), matched.get(spec.reference.subtrahend)].map((n) =>
            n === undefined ? Number.NaN : n + 1,
          );

    if (expected.some(Number.isNaN)) {
      return;
    }

    if (!sameNumbers(named, expected)) {
      out.push({
        kind: 'cross-reference',
        line: i,
        detail:
          `line ${at + 1}: ${spec.citation} requires a reference to how the amount was calculated. ` +
          `It should name ${expected.join(', ')}; it names ${named.length ? named.join(', ') : 'nothing'}`,
      });
    }
  });

  return out;
};

/**
 * Does the SPEC match the regulation?
 *
 * The counterpart of `checkAgainstSource` for tables, and needed for the same
 * reason: a spec seeded from a document we already ship inherits that
 * document's defects and promotes them to authority.
 */
export const checkItemizationAgainstSource = (form: ItemizationForm, sourceText: string): ItemizationDivergence[] =>
  form.lines.flatMap((spec, i) =>
    spec.description === null || containsPrescribedText(sourceText, spec.description)
      ? []
      : [
          {
            kind: 'not-in-source' as const,
            line: i,
            detail: `line ${i}: ${JSON.stringify(spec.description)} does not appear in ${form.sourceFile}`,
          },
        ],
  );

/**
 * How much of the document this checker can see.
 *
 * The same honesty `coverage` provides for tables. §956(a)(3) requires a line
 * per third-party payee and words none of it, so that line's text is checked by
 * nobody; the count is reported so a green suite is not read as a clean form.
 */
export const itemizationCoverage = (form: ItemizationForm) => {
  const described = form.lines.filter((l) => l.description !== null).length;

  return { described, total: form.lines.length, undescribed: form.lines.length - described };
};
