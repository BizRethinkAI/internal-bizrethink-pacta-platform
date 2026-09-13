import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { MCA_INSTRUMENTS } from '../clauses/instruments';
import { inReviewOrder } from '../clauses/library';
import type { McaClause } from '../clauses/types';

export type SelectedMcaClause = McaClause & {
  /** Derived after selection; every clause has a citation. */
  number: string;
  /** Derived section containing this operative clause. */
  sectionNumber: string;
};

/** Instruments whose positions are needed to resolve these bodies' citations. */
export const referencedInstruments = (clauses: Pick<McaClause, 'body'>[]) => {
  const ids = new Set(
    clauses.flatMap((clause) => [
      ...[...clause.body.matchAll(/\[\[clause:([^.\]]+)\./g)].map((match) => match[1]),
      ...[...clause.body.matchAll(/\[\[section:([^#\]]+)#/g)].map((match) => match[1]),
    ]),
  );
  return MCA_INSTRUMENTS.filter((id) => ids.has(id));
};

/** Internal review/assembly data; this does not authorize publication or sending. */
export const numberClauses = (clauses: McaClause[]): SelectedMcaClause[] => {
  if (clauses.some((clause) => clause.kind !== 'clause' || 'unnumberedReason' in clause)) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Only operative clauses may receive clause numbers.' });
  }
  const ordered = inReviewOrder(clauses);
  const sections = [...new Set(ordered.map((clause) => clause.section))];
  const ordinals = new Map<string, number>();

  return ordered.map((clause) => {
    const index = sections.indexOf(clause.section);
    const sectionNumber = String(index + 1);
    const ordinal = (ordinals.get(clause.section) ?? 0) + 1;
    ordinals.set(clause.section, ordinal);
    return { ...clause, number: `${sectionNumber}.${ordinal}`, sectionNumber };
  });
};

/**
 * A reference names an obligation, never a number inherited from a source form.
 * The optional section qualifier (`frpa#purchase`) supports another instrument.
 * Lettered limbs remain inside their parent and follow the token: `…]](b)`.
 */
export const resolveReferences = <T extends Pick<McaClause, 'body' | 'slug' | 'instrument'>>(
  clauses: T[],
  context: SelectedMcaClause[],
): T[] => {
  const byReference = new Map<string, SelectedMcaClause>();
  const sections = new Map<string, string>();
  for (const clause of context) {
    const reference = clause.referenceId ?? clause.slug;
    if (byReference.has(reference)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, {
        message: `More than one selected clause answers reference ${reference}.`,
      });
    }
    byReference.set(reference, clause);
    if (clause.sectionNumber) {
      sections.set(`${clause.instrument}#${clause.section}`, clause.sectionNumber);
    }
  }

  return clauses.map((clause) => {
    const body = clause.body.replace(/\[\[(clause|section):([^\]]+)\]\]/g, (_token, kind: string, target: string) => {
      const number =
        kind === 'clause'
          ? byReference.get(target)?.number
          : sections.get(target.includes('#') ? target : `${clause.instrument}#${target}`);
      if (!number) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, {
          message: `${clause.slug} has an unresolved ${kind} reference: ${target}.`,
        });
      }
      return number;
    });
    if (body.includes('[[') || body.includes(']]')) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, { message: `${clause.slug} has a malformed reference token.` });
    }
    return { ...clause, body };
  });
};
