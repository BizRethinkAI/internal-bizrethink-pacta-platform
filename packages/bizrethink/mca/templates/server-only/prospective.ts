import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

import { getFeatureAccess } from '../../../server-only/feature-access';
import { getMcaEntity } from '../../entities/server-only/service';
import type { ProducedInstrument } from '../../publish/recipient-contract';
import { compileMcaTemplate, type McaTemplateSnapshot } from '../compile';
import { projectTemplateReading } from '../reading';
import { assertMcaTeamAccess, MCA_DRAFT_FEATURE } from './service';

/**
 * The document those two choices would produce, before the template exists.
 *
 * ADR 0026 made creating a template exactly two decisions — an entity and a
 * document type — so the useful thing to show at that moment is what they add
 * up to. `previewMcaTemplate` beside this one needs a saved template and a
 * revision to name; this needs neither, because there is nothing named yet.
 *
 * IT WRITES NOTHING. A preview that quietly created the template would leave a
 * funder holding paper they were only considering, and revision 1 is not a
 * draft — `publishMcaTemplate` publishes against a named revision, and the
 * review pipeline treats every one as a record.
 */
export const previewProspectiveMcaTemplate = async ({
  teamId,
  userId,
  entityId,
  instrument,
}: {
  teamId: number;
  userId: number;
  entityId: string;
  instrument: ProducedInstrument;
}): Promise<McaTemplateSnapshot> => {
  const team = await assertMcaTeamAccess({ teamId, userId });

  /*
    The same permission the saved preview needs. This renders authored legal
    text, and ADR 0016 keeps that behind more than membership — the gate is
    checked BEFORE the entity is read so a caller without it learns nothing
    about which entities exist.
  */
  if (!(await getFeatureAccess({ feature: MCA_DRAFT_FEATURE, organisationId: team.organisationId, userId }))) {
    throw new AppError(AppErrorCode.FORBIDDEN, { message: 'Internal draft preview access is required.' });
  }

  const saved = await getMcaEntity({ teamId, userId, id: entityId });

  /*
    `compileMcaTemplate` refuses a document the programme does not run, and that
    refusal is wanted here rather than worked around: showing one would
    advertise a template the builder would then decline to create.
  */
  return projectTemplateReading(
    compileMcaTemplate({ label: saved.label, identity: saved.identity, policy: saved.policy }, instrument),
  );
};
