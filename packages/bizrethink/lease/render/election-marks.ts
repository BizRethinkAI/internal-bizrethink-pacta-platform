import { Link, Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { createElement as h } from 'react';

import type { LeaseParty, PartyRole } from './signature-blocks';

/**
 * Elections every signer of a role can actually make.
 *
 * A statutory election is two options and a way for EACH person making it to
 * mark one. The early-termination addendum (§83.595(4)) shipped a checkbox for
 * the first tenant only, and the electronic-notice addendum (§83.505) shipped
 * the literal characters "[ ]" for everybody. On the 2026-09-15 pilot lease —
 * two landlords, two jointly liable tenants — three of the four signers had
 * nothing to mark on one addendum, and nobody could mark the other.
 *
 * CLAUSE TEXT MARKS AN OPTION, THE RENDERER PLACES THE BOXES. A line beginning
 * `[[each tenant marks]] ` is an option; beneath it goes one cell per tenant,
 * their name over their own CHECKBOX. The marker reads as English wherever the
 * raw clause text is shown (the clause library, an attorney's review), and the
 * tokens are derived here from the party order — never written into library
 * text, because a recipient index is positional.
 *
 * WHY A ROW OF CELLS AND NOT A BOX BEFORE THE WORDS. A placeholder's widget is
 * the size of its token's text, about 90pt, and the token is painted out before
 * upload — so a box in front of an option pushed its words 90pt to the right
 * of the margin. Beneath the option, in a cell of its own, that width is just
 * the cell.
 */

const MARK = /^\[\[each (landlord|tenant) marks\]\] /;

/** Wide enough for `{{CHECKBOX, r12}}` at the page's 11pt without wrapping, and for a name at 9pt. */
const MARK_CELL = 120;
const MARK_GUTTER = 12;

export type MarkCell = { name: string; token: string };

/**
 * One cell per person of `role`, numbered exactly as `signature-blocks.ts`
 * numbers signers: `r${index + 1}` over the whole party list.
 */
export const markCells = (parties: LeaseParty[], role: PartyRole): MarkCell[] =>
  parties.flatMap((party, index) =>
    party.role === role ? [{ name: party.name, token: `{{CHECKBOX, r${index + 1}}}` }] : [],
  );

/** Blank lines at the edge of a run of text are spacing the option blocks already provide. */
const trimBlankLines = (lines: string[]) => {
  const first = lines.findIndex((line) => line.trim() !== '');

  if (first === -1) {
    return [];
  }

  const last = lines.length - 1 - [...lines].reverse().findIndex((line) => line.trim() !== '');

  return lines.slice(first, last + 1);
};

export type ClauseBodyStyles = {
  /** The clause's own body style, so text around an election is unchanged. */
  body: Style;
  /** A signer's name, as the signature blocks set it. */
  name: Style;
  /** A link's text, where the clause carries `[[link text|url]]`. */
  link?: Style;
  /** A `[[group …]]` heading in a structured list — the receipt's issuing bodies. */
  group?: Style;
  /** A `[[ref]]` line beneath a list entry — its recording reference and extent. */
  note?: Style;
};

/*
  STRUCTURED LIST LINES, for the governing-documents receipt
  (`describeGoverningDocuments`):

    [[group NAME]]      a heading for one issuing body
    [[doc]]TEXT         an entry; `[[doc sub]]` indents it under the one above
    [[ref]]TEXT         a quieter line kept with the entry before it

  One entry and its reference line never part at a page break.
*/
const ROW = /^\[\[(group|doc|ref)( sub)?(?: ([^\]]*))?\]\]/;
const SUB_INDENT = 18;

/*
  `[[link text|url]]` — a clickable link inside a clause's text. Used by the
  receipt addendum so each governing document, and all of them together, can be
  opened from the signed PDF a tenant keeps. Like the election marker it reads
  as what it is wherever the raw text is shown.
*/
const LINK = /\[\[link ([^|\]]+)\|([^\]]+)\]\]/g;

/**
 * Props for a run of text that may carry links.
 *
 * NO HYPHENATION WHERE THERE IS A LINK. The pilot receipt printed "down-load"
 * across a line and split the download-all address with an inserted hyphen, so
 * a printed copy gave an address that does not exist — and every split link
 * became two click targets. Only text that carries a link is affected, so no
 * other clause's pagination moves.
 */
const runProps = (text: string, style: Style, key: string) =>
  text.includes('[[link ') ? { style, key, hyphenationCallback: (word: string) => [word] } : { style, key };

/** A run of text as Text children: strings, with each link marker made a Link. */
const withLinks = (text: string, style: Style | undefined) => {
  const children: (string | ReturnType<typeof h>)[] = [];
  let at = 0;

  for (const match of text.matchAll(LINK)) {
    children.push(text.slice(at, match.index));
    children.push(h(Link, { key: `link-${match.index}`, src: match[2], style }, match[1]));
    at = (match.index ?? 0) + match[0].length;
  }

  children.push(text.slice(at));

  return children;
};

/**
 * A clause's rendered body.
 *
 * Without a marker this is exactly the single Text it always was, so no other
 * clause's layout moves.
 */
export const clauseBody = (content: string, parties: LeaseParty[], styles: ClauseBodyStyles, key: string) => {
  const lines = content.split('\n');

  if (!lines.some((line) => MARK.test(line) || ROW.test(line))) {
    return h(Text, runProps(content, styles.body, key), ...withLinks(content, styles.link));
  }

  const blocks: ReturnType<typeof h>[] = [];
  let run: string[] = [];
  let entry: ReturnType<typeof h>[] | null = null;

  const closeEntry = () => {
    if (entry) {
      blocks.push(h(View, { key: `${key}-entry-${blocks.length}`, wrap: false, style: { marginBottom: 4 } }, ...entry));
      entry = null;
    }
  };

  const flush = () => {
    const kept = trimBlankLines(run);

    if (kept.length > 0) {
      blocks.push(
        h(
          Text,
          runProps(kept.join('\n'), styles.body, `${key}-text-${blocks.length}`),
          ...withLinks(kept.join('\n'), styles.link),
        ),
      );
    }

    run = [];
  };

  for (const line of lines) {
    const row = line.match(ROW);

    if (row) {
      const [marker, kind, sub, name] = row;
      const text = line.slice(marker.length);
      const indent = sub ? { paddingLeft: SUB_INDENT } : {};

      if (kind === 'ref' && entry) {
        entry.push(h(Text, { key: `ref-${entry.length}`, style: [styles.note ?? styles.body, indent] }, text));
        continue;
      }

      flush();
      closeEntry();

      if (kind === 'group') {
        blocks.push(
          h(
            Text,
            {
              key: `${key}-group-${blocks.length}`,
              style: [styles.group ?? styles.body, { marginTop: 10, marginBottom: 4 }],
            },
            name ?? '',
          ),
        );
        continue;
      }

      const props = runProps(text, styles.body, `doc-${blocks.length}`);
      entry = [
        h(Text, { ...props, style: [props.style, { textAlign: 'left' }, indent] }, ...withLinks(text, styles.link)),
      ];
      continue;
    }

    const marked = line.match(MARK);

    if (!marked) {
      if (entry && line.trim() !== '') {
        closeEntry();
      }

      run.push(line);
      continue;
    }

    flush();
    closeEntry();

    blocks.push(
      h(
        View,
        // An option and its boxes are one thing; a page break between them
        // leaves a signer ticking a box under words on the previous page.
        { key: `${key}-option-${blocks.length}`, wrap: false, style: { marginTop: 6, marginBottom: 6 } },
        h(Text, { style: styles.body }, line.slice(marked[0].length)),
        h(
          View,
          { style: { flexDirection: 'row', flexWrap: 'wrap' } },
          ...markCells(parties, marked[1] as PartyRole).map((cell) =>
            h(
              View,
              { key: cell.token, style: { width: MARK_CELL, marginRight: MARK_GUTTER, marginTop: 4 } },
              h(Text, { style: styles.name }, cell.name),
              // Unstyled, like the signature tokens: it inherits the page's
              // 11pt, and must not hyphenate or it reaches the extractor split.
              h(Text, { hyphenationCallback: (word: string) => [word], style: { marginTop: 2 } }, cell.token),
            ),
          ),
        ),
      ),
    );
  }

  closeEntry();
  flush();

  return h(View, { key }, ...blocks);
};
