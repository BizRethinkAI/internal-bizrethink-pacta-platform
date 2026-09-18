import { createEnvelope } from '@documenso/lib/server-only/envelope/create-envelope';
import { putPdfFileServerSide } from '@documenso/lib/universal/upload/put-file.server';
import { mapSecondaryIdToTemplateId } from '@documenso/lib/utils/envelope';
import { EnvelopeType, RecipientRole } from '@prisma/client';

import { INSTRUMENTS } from '../../clauses/instruments';
import { assertMcaTeamAccess, previewMcaTemplate } from '../../templates/server-only/service';
import { assertMcaPackagePublishable } from '../publishable';
import type { ProducedInstrument } from '../recipient-contract';
import { buildMcaTemplateArtifact } from './artifact';
import { recordMcaPublication } from './publications';
import { mcaPublishablePackageFor } from './publishable-package';

/**
 * Publish one instrument of a provider template, and record that it happened.
 *
 * The thin shell over `buildMcaTemplateArtifact`, which is where the difficult
 * part lives. This one touches the world: storage, the envelope, the record.
 * The split is `createEnvelopeFromMatter`'s, for the same reason — the part
 * with two PDF libraries in it should be testable without mocking the world.
 *
 * THE GATE IS FIRST, AND IT IS EXPECTED TO REFUSE. No clause carries a counsel
 * approval, so `assertMcaPackagePublishable` throws for every package today.
 * ADR 0023: it ships shut and stays shut until counsel approves clauses. Put
 * anything before it — a render, an upload — and the refusal costs work and,
 * worse, leaves an orphan behind.
 */
type PublishOptions = {
  userId: number;
  teamId: number;
  /** The provider template, and the exact revision being published. */
  id: string;
  version: number;
  instrument: ProducedInstrument;
  /**
   * Required, not optional.
   *
   * `createEnvelope` demands it and publication is an auditable act — who
   * published this template, from where. Making it optional here would have
   * meant passing `undefined` into a parameter that does not accept one, which
   * is what the type gate caught.
   */
  requestMetadata: Parameters<typeof createEnvelope>[0]['requestMetadata'];
};

/**
 * A template's recipients are placeholders, not people.
 *
 * Documenso's own convention, and what the live records show
 * (`recipient.1@documenso.com`). The caller replaces them per send; what must
 * survive publication is the ORDER and the role name, because the platform
 * addresses a recipient by role and `rN` is a position in this list.
 */
const placeholderRecipients = (signers: { role: string }[]) =>
  signers.map((signer, index) => ({
    email: `recipient.${index + 1}@documenso.com`,
    name: signer.role,
    role: RecipientRole.SIGNER,
    signingOrder: index + 1,
  }));

export const publishMcaTemplate = async ({
  userId,
  teamId,
  id,
  version,
  instrument,
  requestMetadata,
}: PublishOptions) => {
  /*
    PUBLISHING NEEDS TEAM ADMIN OR MANAGER, and asserting it here rather than in
    a route is the point: a second caller must not be able to reach this without
    passing the same check.

    ADR 0016 restricts provider POLICY to a programme's managers because it is
    the funder's programme. Publishing is the act that puts that programme in
    front of a merchant, so it cannot need less.
  */
  await assertMcaTeamAccess({ teamId, userId, write: true });

  // Membership, the draft-rendering grant, and that the revision still compiles
  // to what it compiled to. Decided there, not repeated here.
  const snapshot = await previewMcaTemplate({ userId, teamId, id, version });

  // FIRST. Nothing is rendered, uploaded or created until this has passed.
  assertMcaPackagePublishable(await mcaPublishablePackageFor(snapshot, instrument));

  const artifact = await buildMcaTemplateArtifact(snapshot, instrument, version);
  const title = `${INSTRUMENTS[instrument].title} (rev ${version})`;

  const { documentData } = await putPdfFileServerSide(
    new File([new Uint8Array(artifact.pdf)], `${title}.pdf`, { type: 'application/pdf' }),
  );

  const envelope = await createEnvelope({
    userId,
    teamId,
    internalVersion: 2,
    data: {
      type: EnvelopeType.TEMPLATE,
      title,
      envelopeItems: [{ title, documentDataId: documentData.id, placeholders: artifact.placeholders }],
      recipients: placeholderRecipients(artifact.signers),
    },
    requestMetadata,
  });

  /*
    The numeric id is what `POST /api/v2/template/use` takes, and it is derived
    rather than stored twice: `secondaryId` is `template_123`, and the caller
    needs the 123. Reading it back out here means the record cannot disagree
    with the envelope about which template it is.
  */
  const documensoTemplateId = mapSecondaryIdToTemplateId(envelope.secondaryId);

  const byOrder = new Map(envelope.recipients.map((recipient) => [recipient.signingOrder ?? 0, recipient.id]));

  await recordMcaPublication({
    userId,
    teamId,
    templateId: id,
    templateRevision: version,
    instrument,
    documensoTemplateId,
    envelopeId: envelope.id,
    widgets: artifact.widgets,
    recipients: artifact.signers.map((signer, index) => ({
      role: signer.role,
      signingOrder: index + 1,
      // The id the caller sends back in `/template/use`. Matched by order,
      // which is the only thing both lists agree on by construction.
      recipientId: byOrder.get(index + 1) ?? 0,
    })),
    recipientStates: snapshot.entity.policy.recipientStates,
    venueRule: snapshot.entity.policy.venueRule,
    fingerprint: snapshot.fingerprint,
  });

  return { envelopeId: envelope.id, templateId: documensoTemplateId };
};
