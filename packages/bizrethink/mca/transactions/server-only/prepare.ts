import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { projectTemplateReading } from '../../templates/reading';
import { previewMcaTemplate } from '../../templates/server-only/service';
import { fillMcaDraft } from '../fill';
import type { McaDraftInput } from '../input';

/** Both read paths use the same live membership, draft-text and stale-source checks. */
export const prepareMcaDraft = async (input: {
  userId: number;
  teamId: number;
  id: string;
  version: number;
  draft: McaDraftInput;
}) => {
  const snapshot = await previewMcaTemplate(input);
  if (snapshot.currentRevision !== input.version) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Use the latest provider template revision for a new transaction draft.',
    });
  }
  return {
    ...fillMcaDraft(projectTemplateReading(snapshot), input.draft),
    templateId: input.id,
    version: input.version,
  };
};
