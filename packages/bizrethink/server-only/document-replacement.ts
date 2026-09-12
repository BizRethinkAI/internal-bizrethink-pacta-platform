import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { assertEnvelopeMutable } from '@documenso/lib/server-only/envelope/assert-envelope-mutable';
import { canRecipientBeModified, canRecipientFieldsBeModified } from '@documenso/lib/utils/recipients';
import { prisma } from '@documenso/prisma';
import { type Field, Prisma, type Recipient } from '@prisma/client';

const replacementInclude = {
  fields: true,
  recipients: true,
  envelopeItems: { select: { id: true } },
  documentMeta: true,
  team: { select: { organisation: { select: { organisationClaim: true } } } },
} satisfies Prisma.EnvelopeInclude;

type ReplacementEnvelope = Prisma.EnvelopeGetPayload<{ include: typeof replacementInclude }>;
type ReplacementContext = {
  envelope: ReplacementEnvelope;
  tx: Prisma.TransactionClient;
  afterCommit: (effect: () => Promise<unknown>) => void;
};

/**
 * One authorization snapshot and transaction for a replacement's updates,
 * removals and audit records. Lock the parent, recipients and fields in a fixed
 * order, then read fresh state: an earlier signing write must be visible before
 * mutability is decided. Parent locks also serialize new child/FK inserts.
 * Notification work runs only after the database transaction has committed.
 */
export const withDocumentReplacement = async <T>(
  where: Prisma.EnvelopeWhereUniqueInput,
  operation: (context: ReplacementContext) => Promise<T>,
): Promise<T> => {
  const effects: Array<() => Promise<unknown>> = [];
  const result = await prisma.$transaction(
    async (tx) => {
      const authorized = await tx.envelope.findFirst({ where, select: { id: true } });
      if (!authorized) {
        throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Document not found' });
      }

      // IDs come from the authorized parent query; tagged SQL binds all values.
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Envelope" WHERE "id" = ${authorized.id} FOR UPDATE`);
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Recipient" WHERE "envelopeId" = ${authorized.id} ORDER BY "id" FOR UPDATE`,
      );
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Field" WHERE "envelopeId" = ${authorized.id} ORDER BY "id" FOR UPDATE`,
      );

      const envelope = await tx.envelope.findFirst({ where, include: replacementInclude });
      if (!envelope) {
        throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Document not found' });
      }
      await assertEnvelopeMutable(envelope);
      if (envelope.completedAt) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Document already complete' });
      }

      return operation({
        tx,
        envelope,
        afterCommit: (effect) => {
          effects.push(effect);
        },
      });
    },
    // Each statement after a lock wait must see the preceding writer's commit.
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
  await Promise.all(effects.map((effect) => effect()));
  return result;
};

type ReplacementSnapshot = { fields: Field[]; recipients: Recipient[] };

export const assertFieldReplacement = (
  envelope: ReplacementSnapshot,
  fields: ReadonlyArray<{ id?: number | null; recipientId: number }>,
): Field[] => {
  const existing = new Map(envelope.fields.map((field) => [field.id, field]));
  const retainedIds = new Set(fields.map((field) => field.id));
  for (const field of fields) {
    const persisted = field.id == null ? undefined : existing.get(field.id);
    if (persisted && persisted.recipientId !== field.recipientId) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Field recipient does not match the saved field' });
    }
  }

  const removed = envelope.fields.filter((field) => !retainedIds.has(field.id));
  for (const field of removed) {
    const recipient = envelope.recipients.find((recipient) => recipient.id === field.recipientId);
    if (!recipient || !canRecipientFieldsBeModified(recipient, envelope.fields)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, {
        message: 'Cannot remove a field where the recipient has already interacted with the document',
      });
    }
  }
  return removed;
};

export const assertRecipientReplacement = (
  envelope: ReplacementSnapshot,
  recipients: ReadonlyArray<{ id?: number | null }>,
): Recipient[] => {
  const retainedIds = new Set(recipients.map((recipient) => recipient.id));
  const removed = envelope.recipients.filter((recipient) => !retainedIds.has(recipient.id));
  for (const recipient of removed) {
    if (!canRecipientBeModified(recipient, envelope.fields)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, {
        message: 'Cannot remove a recipient who has already interacted with the document',
      });
    }
  }
  return removed;
};
