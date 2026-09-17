import type { ClauseField } from '../clauses/types';

/**
 * How wide a completed field is, and therefore whether two of them share a row.
 *
 * THIS IS PRESENTATION, AND IT DELIBERATELY LIVES OUTSIDE THE FIELD MODEL.
 * `ClauseField` participates in the clause fingerprint, so putting a column
 * width on it would lapse approvals and stale counsel review links every time
 * somebody moved a blank half an inch. A reviewing attorney reads the words and
 * the labels; the rule width is not one of the things their approval is about.
 *
 * The real documents set the standard this answers to: Lombard's FRPA §1 prints
 * two fields to a row, with the rule sized to the expected answer — a state
 * abbreviation gets a short rule, a street address gets the width of the page.
 * Pacta printed every field as a full-width stacked label-over-value row, which
 * is why its FRPA runs 37 pages against the real document's 23.
 */
export type FieldSpan = 'half' | 'full';

/** Bindings whose answer needs the full measure, whatever their label says. */
const FULL_WIDTH = new Set([
  'merchant.legalName',
  'merchant.businessAddress',
  'merchant.noticeAddress',
  'merchant.designatedNoticeAddress',
  'equipment.description',
  'funding.otherDeductions',
]);

/** Bindings that read as an address but answer in a few characters. */
const HALF_WIDTH = new Set(['merchant.formationState']);

/**
 * An address runs the width of the page; almost everything else is a half.
 *
 * The default is `half` rather than `full` because the paired row is what the
 * real document does, and a field nobody has classified should join the grid
 * rather than break it. A field that genuinely needs the measure says so in
 * `FULL_WIDTH`, which is a list somebody can read.
 */
export const fieldSpan = (field: Pick<ClauseField, 'binding' | 'label' | 'kind'>): FieldSpan => {
  if (field.kind === 'signature') {
    return 'full';
  }
  if (HALF_WIDTH.has(field.binding)) {
    return 'half';
  }
  if (FULL_WIDTH.has(field.binding)) {
    return 'full';
  }
  return /address/i.test(field.binding) || /address/i.test(field.label) ? 'full' : 'half';
};

/**
 * Consecutive halves pair; a full breaks the pair and takes its own row.
 *
 * Order is the document's order, so pairing never reorders a grid to fill a
 * row — two fields sit together because they are printed together, not because
 * the layout wanted a tidier page.
 */
export const fieldRows = <T extends Pick<ClauseField, 'binding' | 'label' | 'kind'>>(fields: T[]): T[][] => {
  const rows: T[][] = [];

  for (const field of fields) {
    const previous = rows.at(-1);

    if (fieldSpan(field) === 'half' && previous?.length === 1 && fieldSpan(previous[0]) === 'half') {
      previous.push(field);
      continue;
    }

    rows.push([field]);
  }

  return rows;
};

export type FieldBlock<T> = { kind: 'grid' | 'money'; fields: T[] };

/**
 * Figures leave the grid and become a column.
 *
 * Two or more currency fields in a row are an itemization, and the real
 * documents set those as label-left, figure-right so the amounts align on one
 * edge and can be read down. A single figure among ordinary answers is not an
 * itemization — it is one answer — so it stays in the grid and keeps its pair.
 */
export const fieldBlocks = <T extends Pick<ClauseField, 'binding' | 'label' | 'kind'>>(
  fields: T[],
): FieldBlock<T>[] => {
  const merge = (blocks: FieldBlock<T>[]): FieldBlock<T>[] =>
    blocks.reduce<FieldBlock<T>[]>((kept, block) => {
      const previous = kept.at(-1);

      if (previous && previous.kind === block.kind) {
        previous.fields.push(...block.fields);
        return kept;
      }

      kept.push({ kind: block.kind, fields: [...block.fields] });
      return kept;
    }, []);

  // One field, one block; the passes below decide what groups with what.
  const runs = merge(fields.map((field) => ({ kind: field.kind === 'currency' ? 'money' : 'grid', fields: [field] })));

  // A rate belongs to the itemization it qualifies. One non-currency field
  // between two columns of figures — an origination fee percentage beside the
  // fee it produces — reads as part of the column, and the real documents set
  // it that way. Two such fields are ordinary answers, not a rate.
  const bridged = merge(
    runs.map((block, index) =>
      block.kind === 'grid' &&
      block.fields.length === 1 &&
      runs[index - 1]?.kind === 'money' &&
      runs[index + 1]?.kind === 'money'
        ? { kind: 'money' as const, fields: block.fields }
        : block,
    ),
  );

  // A column of one is a field, not a table: it keeps the grid's pairing
  // rather than sitting alone on a full-width row.
  return merge(
    bridged.map((block) =>
      block.kind === 'money' && block.fields.length < 2 ? { ...block, kind: 'grid' as const } : block,
    ),
  );
};
