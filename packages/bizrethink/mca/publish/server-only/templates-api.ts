import { getApiTokenByToken } from '@documenso/lib/server-only/public-api/get-api-token-by-token';
import { prisma } from '@documenso/prisma';

import { getFeatureAccess } from '../../../server-only/feature-access';
import type { McaInstrument } from '../../clauses/instruments';
import { MCA_BUILDER_FEATURE } from '../../templates/server-only/service';
import type { McaPublicationRecipient } from './publications';

/**
 * Where a caller reads what is published, instead of holding a copy of it.
 *
 * ADR 0023 §2 and ADR 0024. `lombard-platform` vendors
 * `src/templates/*.published.json` — a snapshot of every published template —
 * and its own widget-totality spec compares its builders against that snapshot.
 * Both sides of the comparison come from the same copy, so nothing there can
 * notice it going stale against what is actually published. This endpoint is
 * the source that makes the copy unnecessary.
 *
 * THE RESPONSE IS SHAPED AS THE CALLER ALREADY READS IT — `templateId`,
 * `envelopeId`, `acroformFields`, and `recipients` keyed by role — so adopting
 * it is a change of source rather than a rewrite of `sendDocument`.
 *
 * AUTHORISATION IS THE TOKEN, NOT A MEMBERSHIP. `ApiToken` has a required
 * `teamId` and a nullable `userId`: a team token need not belong to a person,
 * so the membership check the interactive services run cannot apply here. The
 * token is the grant, bound to its own team, and the feature grant is checked
 * on that team's organisation.
 */
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };

const bearer = (request: Request): string | null => {
  const header = request.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
};

type PublishedRow = {
  templateId: string;
  templateRevision: number;
  instrument: string;
  documensoTemplateId: number;
  envelopeId: string;
  widgets: unknown;
  recipients: unknown;
  fingerprint: string;
  publishedAt: Date;
};

const asResponse = (row: PublishedRow) => ({
  instrument: row.instrument as McaInstrument,
  /** What `POST /api/v2/template/use` takes. */
  templateId: row.documensoTemplateId,
  envelopeId: row.envelopeId,
  /** The widget names to prefill by, as published. */
  acroformFields: row.widgets as string[],
  recipients: Object.fromEntries(
    (row.recipients as McaPublicationRecipient[]).map((party) => [
      party.role,
      { id: party.recipientId, signingOrder: party.signingOrder },
    ]),
  ),
  /** Which recipe produced it, so a caller can say what it is sending. */
  providerTemplateId: row.templateId,
  providerTemplateRevision: row.templateRevision,
  fingerprint: row.fingerprint,
  publishedAt: row.publishedAt.toISOString(),
});

export const listMcaTemplatesForApi = async (request: Request): Promise<Response> => {
  if (request.method !== 'GET') {
    return Response.json({ message: 'Method not allowed' }, { status: 405, headers });
  }

  const token = bearer(request);

  if (!token) {
    return Response.json({ message: 'An API token is required.' }, { status: 401, headers });
  }

  let teamId: number;
  let organisationId: string;
  let userId: number | null;

  try {
    const apiToken = await getApiTokenByToken({ token });

    teamId = apiToken.team.id;
    organisationId = apiToken.team.organisationId;
    userId = apiToken.userId ?? null;
  } catch {
    // Deliberately uniform: a caller learns that the token did not work, never
    // whether it existed, expired or belongs to a disabled account.
    return Response.json({ message: 'Invalid token.' }, { status: 401, headers });
  }

  if (!(await getFeatureAccess({ feature: MCA_BUILDER_FEATURE, organisationId, userId: userId ?? 0 }))) {
    // Not 403: a team without the builder has no MCA templates to speak of, and
    // saying "forbidden" would confirm that some exist.
    return Response.json({ message: 'MCA templates are unavailable for this team.' }, { status: 404, headers });
  }

  const rows = await prisma.bizrethinkMcaPublication.findMany({
    where: { teamId, organisationId },
    orderBy: { publishedAt: 'desc' },
    select: {
      templateId: true,
      templateRevision: true,
      instrument: true,
      documensoTemplateId: true,
      envelopeId: true,
      widgets: true,
      recipients: true,
      fingerprint: true,
      publishedAt: true,
    },
  });

  // Append-only, so the table holds every past publication. Current is the
  // newest per instrument, resolved here — a caller that had to work it out
  // could work it out differently, which is the failure this record ends.
  const newest = new Map<string, PublishedRow>();

  for (const row of rows) {
    if (!newest.has(row.instrument)) {
      newest.set(row.instrument, row);
    }
  }

  return Response.json({ templates: [...newest.values()].map(asResponse) }, { headers });
};
