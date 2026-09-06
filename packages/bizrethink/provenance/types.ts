import type { ClauseStatus } from '../server-only/feature-access';

/**
 * Where a clause's words came from.
 *
 * This is a provenance record, not a label. Three of the five variants below
 * carry legal weight — statutory text must be reproduced exactly,
 * Supreme-Court-approved form text is the strongest available answer to the
 * unauthorized-practice-of-law question because those forms exist precisely so
 * that non-lawyers may complete them, and a regulator-prescribed form fixes the
 * document's STRUCTURE as well as its words.
 *
 * Note what is NOT representable here: there is no variant for text lifted from
 * someone else's document. The executed Zillow and First In Property Management
 * leases are a REQUIREMENTS INVENTORY — they tell us which terms the deal needs
 * — but their prose is the copyrighted work product of Zillow and of First In's
 * forms vendor. Making that unrepresentable in the type is cheaper than
 * remembering not to do it.
 *
 * LIVES OUTSIDE ANY VERTICAL, DELIBERATELY. Provenance is not a property of
 * rental tenancy or of merchant cash advance; it is a property of text. It sat
 * in `lease/clauses/types.ts` only because leases were built first, and the MCA
 * vertical needing the same guard is what surfaced the mislocation. A
 * merchant-cash-advance package importing from a rental-lease package would
 * have been worse than either.
 */
export type ClauseSource =
  | {
      kind: 'statute';
      /** e.g. 'Fla. Stat. §404.056(5)'. */
      citation: string;
      /**
       * True when the statute prescribes exact words and a paraphrase does not
       * satisfy it. Such clauses must never be edited for tone or length.
       */
      verbatimRequired: boolean;
      /**
       * ISO date on which the text was last checked against the current
       * statute. Null means unverified — see `assertPublishable`.
       */
      verbatimVerifiedAt: string | null;
    }
  | {
      kind: 'court-approved-form';
      /** e.g. 'RLHD-3x Rev 7/16'. */
      form: string;
      citation: string;
    }
  | {
      /**
       * A form whose STRUCTURE a regulator prescribes, not merely its words.
       *
       * Distinct from `statute` because `verbatimRequired` covers words and
       * nothing else, and these forms fix more than words: 10 CCR §914 fixes
       * nine rows with exact labels and closes most of them with "shall include
       * only"; 23 NYCRR §600.6 fixes ten and adds a Collateral Requirements row
       * California never asks for; Connecticut's Appendix A and Virginia's form
       * fix the layout while leaving the answers to us.
       *
       * Distinct from `court-approved-form` because that variant answers the
       * unauthorized-practice question — those forms exist so non-lawyers may
       * complete them. These exist so a regulator can dictate what a recipient
       * is shown, and carry no UPL implication at all.
       *
       * Both dates must be set to publish. They fail independently and for
       * different reasons: a regulator can amend the prescribed wording while
       * leaving the table alone, or reorder the table while leaving the wording
       * alone, and either one silently invalidates a form that still matches
       * the other.
       */
      kind: 'regulator-prescribed-form';
      /** e.g. '10 CCR §914' or 'Conn. DOB Appendix A (rev. 8/1/2024)'. */
      citation: string;
      /** The vendored primary text this was transcribed from. */
      sourceFile: string;
      /** ISO date the WORDS were last checked against that text. */
      verbatimVerifiedAt: string | null;
      /** ISO date the ROWS, their labels and their order were last checked. */
      structureVerifiedAt: string | null;
    }
  | {
      kind: 'attorney-drafted';
      /** Name and bar number. Null until the engagement happens. */
      author: string | null;
    }
  | {
      kind: 'customer-authored';
    };

export type ClauseVariable = {
  name: string;
  type: 'string' | 'number' | 'usd' | 'date' | 'boolean';
  label: string;
  required: boolean;
};

/**
 * The minimum a thing must be for its provenance to be judged.
 *
 * Structural rather than nominal on purpose: the lease's `Clause` satisfies it
 * already, and an MCA prescribed form will satisfy it without either vertical
 * having to know about the other. Widening the parameter from `Clause` is what
 * made this function shareable — nothing in its body ever looked at a lease.
 */
export type HasProvenance = {
  slug: string;
  source: ClauseSource;
  status: ClauseStatus;
};

/**
 * Guard for the second lock. A clause may only reach `published` — i.e. become
 * renderable for an organisation that is not BizRethink-internal — once its
 * provenance actually supports that.
 *
 * Statutory text needs a verification date, because a statute that has been
 * amended silently invalidates a clause that still quotes the old wording.
 * A regulator-prescribed form needs two, for words and for structure.
 * Attorney-drafted text needs a named author. This is the mechanism that stops
 * unreviewed language reaching a third party; see `feature-access.ts`.
 */
export const assertPublishable = (clause: HasProvenance): string[] => {
  const problems: string[] = [];

  if (clause.status !== 'published') {
    return problems;
  }

  if (clause.source.kind === 'statute' && clause.source.verbatimVerifiedAt === null) {
    problems.push(`${clause.slug}: statutory text published without a verification date`);
  }

  if (clause.source.kind === 'regulator-prescribed-form') {
    if (clause.source.verbatimVerifiedAt === null) {
      problems.push(
        `${clause.slug}: regulator-prescribed text published without a verification date`,
      );
    }

    if (clause.source.structureVerifiedAt === null) {
      problems.push(
        `${clause.slug}: regulator-prescribed form published without a structure verification date`,
      );
    }
  }

  if (clause.source.kind === 'attorney-drafted' && clause.source.author === null) {
    problems.push(`${clause.slug}: attorney-drafted text published without a named reviewer`);
  }

  if (clause.source.kind === 'customer-authored') {
    problems.push(`${clause.slug}: customer-authored text can never be published to the shared library`);
  }

  return problems;
};
