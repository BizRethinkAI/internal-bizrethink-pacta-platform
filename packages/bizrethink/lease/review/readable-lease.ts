import { FL_SECTION_NAMES } from '../clauses/us-fl';
import type { RenderedClause } from '../render/lease-document';

/**
 * The lease as something a person can read in a web page.
 *
 * The reviewer used to get a BUTTON — "Open the lease" — which opened the
 * signing PDF in another tab. So they read in one window and, in the other,
 * typed a clause name from memory into a free-text box. Nothing tied a comment
 * to a clause; `clauseSlug` was whatever string arrived.
 *
 * The data to do better has always been there: `buildLeaseDocuments` returns
 * every clause with its number, its heading and its interpolated text. This is
 * that, grouped into sections, with the signing tokens gone — a tenant has no
 * business seeing `{{SIGNATURE, r2, width=160, height=44}}` in the middle of
 * the document they are being asked to comment on.
 */

export type ReadableClause = {
  slug: string;
  number: string;
  heading: string;
  text: string;
};

export type ReadableSection = {
  number: string;
  name: string;
  clauses: ReadableClause[];
};

/*
  Anything the signing platform will replace. A token is furniture for the
  envelope builder; to a reader it is noise that looks like a defect.
*/
const TOKEN = /\{\{[^}]*\}\}/g;

const withoutTokens = (text: string): string =>
  text
    .replace(TOKEN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

/**
 * Grouped on the leading component of the derived number, exactly as the PDF
 * groups them, so the reader's contents and the printed contents cannot
 * disagree about where a section begins.
 */
export const toReadableSections = (clauses: RenderedClause[]): ReadableSection[] =>
  clauses.reduce<ReadableSection[]>((sections, rendered) => {
    const number = (rendered.number ?? '').split('.')[0];
    const readable: ReadableClause = {
      slug: rendered.clause.slug,
      number: rendered.number ?? '',
      heading: rendered.clause.heading,
      text: withoutTokens(rendered.text),
    };

    const last = sections[sections.length - 1];

    if (last !== undefined && last.number === number) {
      last.clauses.push(readable);

      return sections;
    }

    const slug = rendered.clause.section as keyof typeof FL_SECTION_NAMES;

    return [...sections, { number, name: FL_SECTION_NAMES[slug] ?? rendered.clause.section, clauses: [readable] }];
  }, []);

/** Every clause slug the reviewer was actually shown. */
export const readableSlugs = (sections: ReadableSection[]): string[] =>
  sections.flatMap((section) => section.clauses.map((clause) => clause.slug));
