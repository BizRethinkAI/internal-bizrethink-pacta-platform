import { randomUUID } from 'node:crypto';

import { prisma } from '@documenso/prisma';

import type { McaInstrument } from '../../clauses/instruments';
import { assertMcaTeamAccess } from '../../templates/server-only/service';

/**
 * What was published, kept by the producer that published it.
 *
 * ADR 0023 §2, extended to every MCA template by ADR 0024.
 *
 * WHAT THIS REPLACES, AND WHY IT IS THE CAUSE RATHER THAN THE SYMPTOM.
 * `lombard-platform` vendors a COPY of every published template into
 * `src/templates/*.published.json`, and its own widget-totality spec compares
 * its builders against that copy. Both sides of that comparison come from one
 * snapshot, so nothing there can notice the snapshot going stale against what
 * is actually published: republish a template without refreshing the copy and
 * CI stays green while production drifts. A runtime guard on the sending side
 * catches that late and reports it as a warning. Serving the record from the
 * producer removes the copy, so there is nothing left to go stale.
 *
 * APPEND-ONLY, like `BizrethinkMcaTemplateRevision`. A row is the record of
 * what a merchant was actually sent. Re-publishing writes a new row; there is
 * no update and no delete, so an earlier publication stays readable after it
 * has been replaced.
 */
type TeamActor = { teamId: number; userId: number };

export type McaPublicationRecipient = {
  role: string;
  signingOrder: number;
  /** The template recipient's own id, which `/template/use` takes. */
  recipientId: number;
};

export type McaPublicationInput = TeamActor & {
  templateId: string;
  templateRevision: number;
  instrument: McaInstrument;
  documensoTemplateId: number;
  envelopeId: string;
  /** The AcroForm widget names as published, which the caller prefills by. */
  widgets: string[];
  recipients: McaPublicationRecipient[];
  /**
   * What this template is for, so a caller holding several can choose.
   *
   * Pacta labels the goods; the entity runs the business. Which template suits a
   * given merchant is the entity's decision with the entity's deal data — this
   * refuses nothing, and exists because an entity cannot choose between two
   * templates that do not say what they are for.
   */
  recipientStates: string[];
  venueRule: string;
  /** The compiled snapshot's fingerprint at the moment of publication. */
  fingerprint: string;
};

export type McaPublication = {
  id: string;
  templateId: string;
  templateRevision: number;
  instrument: McaInstrument;
  documensoTemplateId: number;
  envelopeId: string;
  widgets: string[];
  recipients: McaPublicationRecipient[];
  recipientStates: string[];
  venueRule: string;
  fingerprint: string;
  publishedAt: Date;
};

export const recordMcaPublication = async ({
  teamId,
  userId,
  ...published
}: McaPublicationInput): Promise<{ id: string }> => {
  const team = await assertMcaTeamAccess({ teamId, userId });

  const row = await prisma.bizrethinkMcaPublication.create({
    data: {
      id: `mcapub_${randomUUID().replace(/-/g, '')}`,
      organisationId: team.organisationId,
      teamId: team.id,
      templateId: published.templateId,
      templateRevision: published.templateRevision,
      instrument: published.instrument,
      documensoTemplateId: published.documensoTemplateId,
      envelopeId: published.envelopeId,
      widgets: published.widgets,
      recipients: published.recipients,
      recipientStates: published.recipientStates,
      venueRule: published.venueRule,
      fingerprint: published.fingerprint,
      publishedByUserId: userId,
    },
    select: { id: true },
  });

  return row;
};

/**
 * What is current, one row per instrument.
 *
 * The table holds every past publication, so "current" is the newest per
 * instrument — and it is resolved here rather than by the caller, because a
 * caller that had to work it out could work it out differently. That is the
 * whole failure this record exists to end.
 */
export const currentMcaPublications = async ({ teamId, userId }: TeamActor): Promise<McaPublication[]> => {
  const team = await assertMcaTeamAccess({ teamId, userId });

  const rows = await prisma.bizrethinkMcaPublication.findMany({
    where: { teamId: team.id, organisationId: team.organisationId },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      templateId: true,
      templateRevision: true,
      instrument: true,
      documensoTemplateId: true,
      envelopeId: true,
      widgets: true,
      recipients: true,
      recipientStates: true,
      venueRule: true,
      fingerprint: true,
      publishedAt: true,
    },
  });

  const newest = new Map<string, McaPublication>();

  for (const row of rows) {
    // Newest first, so the first sighting of an instrument is the current one.
    if (!newest.has(row.instrument)) {
      newest.set(row.instrument, {
        ...row,
        instrument: row.instrument as McaInstrument,
        widgets: row.widgets as string[],
        recipients: row.recipients as McaPublicationRecipient[],
        recipientStates: row.recipientStates as string[],
      });
    }
  }

  return [...newest.values()];
};
