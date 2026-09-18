import { previewMcaTemplate } from '../../templates/server-only/service';
import { type McaPublishRefusal, mcaPublicationRefusals } from '../publishable';
import type { ProducedInstrument } from '../recipient-contract';
import { mcaPublishablePackageFor } from './publishable-package';

/**
 * Why this template may not be published, without trying to publish it.
 *
 * The same rule `publishMcaTemplate` runs, read rather than enforced. A person
 * deciding whether to publish should be able to see what stands in the way
 * first — a button that only tells you once you press it teaches people to
 * press it and read afterwards.
 *
 * ONE RULE, TWO CALLERS. This does not re-implement the gate; it calls
 * `mcaPublicationRefusals` over the package `mcaPublishablePackageFor` builds,
 * which is the same package the publish path judges. A screen that disagreed
 * with the gate would be worse than no screen, because it would be believed.
 */
export type McaPublicationStatus = {
  instrument: ProducedInstrument;
  refusals: McaPublishRefusal[];
  /** False whenever anything stands in the way. Never true today. */
  publishable: boolean;
};

export const mcaPublicationStatus = async ({
  userId,
  teamId,
  id,
  version,
  instrument,
}: {
  userId: number;
  teamId: number;
  id: string;
  version: number;
  instrument: ProducedInstrument;
}): Promise<McaPublicationStatus> => {
  // Membership, the draft grant and revision currency, decided where they are
  // decided everywhere else in this vertical.
  const snapshot = await previewMcaTemplate({ userId, teamId, id, version });
  const refusals = mcaPublicationRefusals(await mcaPublishablePackageFor(snapshot, instrument));

  return { instrument, refusals, publishable: refusals.length === 0 };
};
