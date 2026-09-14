import type { LegalSegment } from '../../legal-ui/reading';
import type { McaInstrument } from '../clauses/instruments';
import { resolveReferences, type SelectedMcaClause } from './number-clauses';

/** Uses the compiler's validation and numbers, while retaining canonical targets. */
export const referenceSegments = (
  source: { body: string; slug: string; instrument: McaInstrument },
  context: SelectedMcaClause[],
  selectionContext = 'base',
): LegalSegment[] => {
  resolveReferences([source], context);
  const segments: LegalSegment[] = [];
  let offset = 0;
  for (const match of source.body.matchAll(/\[\[(clause|section):([^\]]+)\]\]/g)) {
    const start = match.index;
    if (start > offset) {
      segments.push({ kind: 'text', text: source.body.slice(offset, start) });
    }
    const sectionTarget = match[2].includes('#') ? match[2] : `${source.instrument}#${match[2]}`;
    const target = context.find((clause) =>
      match[1] === 'clause'
        ? (clause.referenceId ?? clause.slug) === match[2]
        : `${clause.instrument}#${clause.section}` === sectionTarget,
    );
    // resolveReferences above has already rejected missing/ambiguous targets.
    if (target) {
      segments.push({
        kind: 'reference',
        text: match[1] === 'clause' ? target.number : target.sectionNumber,
        targetKind: match[1] === 'clause' ? 'clause' : 'section',
        targetSlug: target.slug,
        instrument: target.instrument,
        section: target.section,
        context: selectionContext,
      });
    }
    offset = start + match[0].length;
  }
  if (offset < source.body.length) {
    segments.push({ kind: 'text', text: source.body.slice(offset) });
  }
  return segments;
};
