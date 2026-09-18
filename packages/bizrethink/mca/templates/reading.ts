import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { ALL_MCA_CONTENT } from '../catalogue';
import { referenceSegments } from '../engine/reference-segments';
import { selectClauses } from '../engine/select-clauses';
import { entitySelectionFacts } from '../entities/entity';
import { entityValues, type McaTemplateSnapshot, populateEntity } from './compile';

/** Apply only after the existing access/current-source check; never save or hash this projection. */
export const projectTemplateReading = <T extends McaTemplateSnapshot>(snapshot: T): T => {
  const facts = entitySelectionFacts(snapshot.entity);
  const context = snapshot.documents.flatMap(
    (document) => selectClauses({ instrument: document.instrument, facts }).selected,
  );
  const values = entityValues(snapshot.entity);
  return {
    ...snapshot,
    documents: snapshot.documents.map((document) => ({
      ...document,
      items: document.items.map((item) => {
        const source = ALL_MCA_CONTENT.find((entry) => entry.slug === item.slug);
        if (!source) {
          throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'The selected source item is unavailable.' });
        }
        const segments = referenceSegments(
          { ...source, body: populateEntity(source.body, snapshot.entity, document.instrument, values) },
          context,
          'Saved provider selection',
        );
        // compileMcaTemplate receives resolved operative bodies from selectClauses,
        // and resolves reusable bodies before placement. item.body therefore
        // already contains numbers; keep this exact saved-wording comparison.
        if (segments.map((part) => part.text).join('') !== item.body) {
          throw new AppError(AppErrorCode.INVALID_REQUEST, {
            message: 'The reading projection no longer matches this saved wording.',
          });
        }
        return { ...item, reading: { number: item.number, context: 'Saved provider selection', segments } };
      }),
    })),
  };
};
