/** A-08: authenticated HTTP, persisted signatures and concurrent PostgreSQL writes. */
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { ZRecipientAuthOptionsSchema } from '@documenso/lib/types/document-auth';
import { FIELD_SIGNATURE_META_DEFAULT_VALUES } from '@documenso/lib/types/field-meta';
import { mapSecondaryIdToDocumentId } from '@documenso/lib/utils/envelope';
import { prisma } from '@documenso/prisma';
import { seedPendingDocument } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';
import type { Field, Recipient } from '@prisma/client';
import { DocumentStatus, EnvelopeType, FieldType, Prisma, SigningStatus } from '@prisma/client';

const baseURL = NEXT_PUBLIC_WEBAPP_URL();
const fixture = async (version: 1 | 2, protectedAlice = true) => {
  const sender = await seedUser();
  const envelope = await seedPendingDocument(
    sender.user,
    sender.team.id,
    [`alice-${sender.user.id}@example.invalid`, `bob-${sender.user.id}@example.invalid`],
    { internalVersion: version },
  );
  // This seed starts with inserted name fields. Reset them so Bob is genuinely
  // untouched and only the explicit Alice setup below establishes protection.
  await prisma.field.updateMany({
    where: { envelopeId: envelope.id },
    data: { inserted: false, customText: '' },
  });
  const recipients = await prisma.recipient.findMany({ where: { envelopeId: envelope.id }, orderBy: { id: 'asc' } });
  const alice = await prisma.recipient.update({
    where: { id: recipients[0].id },
    data: {
      signingStatus: protectedAlice ? SigningStatus.SIGNED : SigningStatus.NOT_SIGNED,
      signingOrder: 1,
      signedAt: null,
    },
  });
  const bob = await prisma.recipient.update({
    where: { id: recipients[1].id },
    data: { signingStatus: SigningStatus.NOT_SIGNED, signingOrder: 2, signedAt: null },
  });
  // Use valid signature metadata and a real stored signature whose cascade
  // deletion must be prevented.
  const original = await prisma.field.findFirstOrThrow({ where: { recipientId: alice.id } });
  const aliceField = await prisma.field.update({
    where: { id: original.id },
    data: {
      type: FieldType.SIGNATURE,
      fieldMeta: FIELD_SIGNATURE_META_DEFAULT_VALUES,
      inserted: protectedAlice,
      ...(protectedAlice
        ? { signature: { create: { recipientId: alice.id, typedSignature: 'A-08 existing signature' } } }
        : {}),
    },
  });
  const fields = await prisma.field.findMany({ where: { envelopeId: envelope.id }, orderBy: { id: 'asc' } });
  return { sender, envelope, alice, bob, aliceField, fields, version };
};
type Fixture = Awaited<ReturnType<typeof fixture>>;
type Kind = 'fields' | 'recipients';
const expectOk = async (response: APIResponse) => {
  expect(response.ok(), await response.text()).toBe(true);
};
const expectDenied = async (response: APIResponse, code = 'INVALID_REQUEST') => {
  expect(response.ok(), await response.text()).toBe(false);
  expect((await response.json()).error.json.data.code).toBe(code);
};
const signIn = async (request: APIRequestContext, email: string) => {
  const csrf = await request.get(`${baseURL}/api/auth/csrf`);
  await expectOk(csrf);
  const { csrfToken } = await csrf.json();
  await expectOk(
    await request.post(`${baseURL}/api/auth/email-password/authorize`, {
      data: { email, password: 'password', csrfToken },
    }),
  );
  const session = await request.get(`${baseURL}/api/auth/session`);
  expect((await session.json()).user?.email).toBe(email);
};
const fieldInput = (field: Field, version: 1 | 2) => ({
  id: field.id,
  envelopeItemId: field.envelopeItemId,
  recipientId: field.recipientId,
  type: field.type,
  fieldMeta: field.fieldMeta ?? undefined,
  ...(version === 1
    ? {
        pageNumber: field.page,
        pageX: field.positionX.toNumber(),
        pageY: field.positionY.toNumber(),
        pageWidth: field.width.toNumber(),
        pageHeight: field.height.toNumber(),
      }
    : {
        page: field.page,
        positionX: field.positionX.toNumber(),
        positionY: field.positionY.toNumber(),
        width: field.width.toNumber(),
        height: field.height.toNumber(),
      }),
});
const recipientInput = (recipient: Recipient) => ({
  id: recipient.id,
  email: recipient.email,
  name: recipient.name,
  role: recipient.role,
  signingOrder: recipient.signingOrder ?? undefined,
  actionAuth: ZRecipientAuthOptionsSchema.parse(recipient.authOptions).actionAuth,
});
const replace = (
  request: APIRequestContext,
  f: Fixture,
  kind: Kind,
  entries: Array<Record<string, unknown>>,
  teamId = f.sender.team.id,
) => {
  const name =
    f.version === 1
      ? kind === 'fields'
        ? 'field.setFieldsForDocument'
        : 'recipient.setDocumentRecipients'
      : kind === 'fields'
        ? 'envelope.field.set'
        : 'envelope.recipient.set';
  return request.post(`${baseURL}/api/trpc/${name}`, {
    headers: { 'x-team-id': String(teamId), 'content-type': 'application/json' },
    data: JSON.stringify({
      json: {
        ...(f.version === 1
          ? { documentId: mapSecondaryIdToDocumentId(f.envelope.secondaryId) }
          : { envelopeId: f.envelope.id, envelopeType: EnvelopeType.DOCUMENT }),
        [kind]: entries,
      },
    }),
  });
};
const stored = async (f: Fixture) => ({
  recipients: await prisma.recipient.findMany({ where: { envelopeId: f.envelope.id }, orderBy: { id: 'asc' } }),
  fields: await prisma.field.findMany({
    where: { envelopeId: f.envelope.id },
    orderBy: { id: 'asc' },
    include: { signature: true },
  }),
  auditCount: await prisma.documentAuditLog.count({ where: { envelopeId: f.envelope.id } }),
});
const retained = (f: Fixture, kind: Kind): Array<Record<string, unknown>> =>
  kind === 'fields' ? f.fields.map((field) => fieldInput(field, f.version)) : [f.alice, f.bob].map(recipientInput);
const omitAlice = (f: Fixture, kind: Kind) =>
  kind === 'fields'
    ? f.fields.filter((field) => field.recipientId !== f.alice.id).map((field) => fieldInput(field, f.version))
    : [{ ...recipientInput(f.bob), name: 'Updated Bob' }];

for (const version of [1, 2] as const) {
  for (const kind of ['fields', 'recipients'] as const) {
    test(`A-08 v${version} ${kind} replacement protects a signed participant and permits untouched edits`, async ({
      request,
    }) => {
      const f = await fixture(version);
      await signIn(request, f.sender.user.email);
      const before = await stored(f);
      await expectDenied(await replace(request, f, kind, omitAlice(f, kind)));
      expect(await stored(f)).toEqual(before);
      await expectDenied(await replace(request, f, kind, []));
      expect(await stored(f)).toEqual(before);
      // A saved field is protected before the recipient's final completion too.
      await prisma.recipient.update({ where: { id: f.alice.id }, data: { signingStatus: SigningStatus.NOT_SIGNED } });
      const partiallySigned = await stored(f);
      await expectDenied(await replace(request, f, kind, omitAlice(f, kind)));
      expect(await stored(f)).toEqual(partiallySigned);
      await prisma.recipient.update({ where: { id: f.alice.id }, data: { signingStatus: SigningStatus.SIGNED } });
      if (kind === 'fields') {
        const spoofed = f.fields.map((field) =>
          field.id === f.aliceField.id
            ? {
                ...fieldInput(field, version),
                recipientId: f.bob.id,
                ...(version === 1 ? { pageX: 25 } : { positionX: 25 }),
              }
            : fieldInput(field, version),
        );
        await expectDenied(await replace(request, f, kind, spoofed));
        expect(await stored(f)).toEqual(before);
      }

      const updated = retained(f, kind).map((entry) => {
        const isBob = kind === 'fields' ? entry.recipientId === f.bob.id : entry.id === f.bob.id;
        return !isBob
          ? entry
          : {
              ...entry,
              ...(kind === 'recipients' ? { name: 'Updated Bob' } : version === 1 ? { pageX: 25 } : { positionX: 25 }),
            };
      });
      await expectOk(await replace(request, f, kind, updated));
      const after = await stored(f);
      expect(after.fields.find((field) => field.id === f.aliceField.id)).toEqual(
        before.fields.find((field) => field.id === f.aliceField.id),
      );
      expect(after.recipients.find((recipient) => recipient.id === f.alice.id)).toEqual(f.alice);
      expect(after.auditCount).toBeGreaterThan(before.auditCount);
      if (kind === 'fields') {
        expect(after.fields.find((field) => field.recipientId === f.bob.id)?.positionX.toNumber()).toBe(25);
      } else {
        expect(after.recipients.find((recipient) => recipient.id === f.bob.id)?.name).toBe('Updated Bob');
      }
    });
  }
}

for (const kind of ['fields', 'recipients'] as const) {
  test(`A-08 ${kind} replacement honors AES/QES state locks and parent authorization`, async ({ request }) => {
    const f = await fixture(2, false);
    const outsider = await seedUser();
    await signIn(request, outsider.user.email);
    const before = await stored(f);
    await expectDenied(await replace(request, f, kind, retained(f, kind), outsider.team.id), 'NOT_FOUND');
    expect(await stored(f)).toEqual(before);
    await signIn(request, f.sender.user.email);
    for (const signatureLevel of ['AES', 'QES']) {
      await prisma.envelope.update({ where: { id: f.envelope.id }, data: { signatureLevel } });
      await expectDenied(await replace(request, f, kind, retained(f, kind)), 'ENVELOPE_TSP_LOCKED');
      expect(await stored(f)).toEqual(before);
    }
    await prisma.envelope.update({ where: { id: f.envelope.id }, data: { status: DocumentStatus.DRAFT } });
    await expectOk(await replace(request, f, kind, omitAlice(f, kind)));
    expect((await stored(f)).fields.every((field) => field.recipientId !== f.alice.id)).toBe(true);

    // A replacement can still create new editable entries as well as remove
    // untouched ones. Keep Bob's current entry and append one without an ID.
    const remaining = omitAlice(f, kind);
    const created = {
      ...remaining[0],
      id: undefined,
      ...(kind === 'recipients' ? { name: 'Carol', email: 'carol@example.invalid', signingOrder: 3 } : {}),
    };
    await expectOk(await replace(request, f, kind, [...remaining, created]));
    expect((await stored(f))[kind]).toHaveLength(2);
  });

  test(`A-08 ${kind} replacement sees a signing commit made while it waits for a row lock`, async ({ request }) => {
    const f = await fixture(2, false);
    await signIn(request, f.sender.user.email);
    const before = await stored(f);
    const pending: { response?: Promise<APIResponse> } = {};
    try {
      await prisma.$transaction(
        async (tx) => {
          const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>(Prisma.sql`SELECT pg_backend_pid() AS pid`);
          await tx.recipient.update({ where: { id: f.alice.id }, data: { signingStatus: SigningStatus.SIGNED } });
          await tx.field.update({
            where: { id: f.aliceField.id },
            data: {
              inserted: true,
              signature: { create: { recipientId: f.alice.id, typedSignature: 'A-08 concurrent signature' } },
            },
          });
          pending.response = replace(request, f, kind, omitAlice(f, kind));
          // Observe a real database wait on this transaction, not a timed sleep.
          await expect
            .poll(
              async () => {
                const [{ blocked }] = await prisma.$queryRaw<Array<{ blocked: boolean }>>(Prisma.sql`
                  SELECT EXISTS (
                    SELECT 1 FROM pg_stat_activity AS activity
                    WHERE activity.datname = current_database()
                      AND ${pid} = ANY(pg_blocking_pids(activity.pid))
                  ) AS blocked
                `);
                return blocked;
              },
              { timeout: 4000 },
            )
            .toBe(true);
        },
        { timeout: 10000 },
      );
      if (!pending.response) {
        throw new Error('Replacement request was not started');
      }
      await expectDenied(await pending.response);
      const after = await stored(f);
      expect(after.recipients.find((recipient) => recipient.id === f.alice.id)?.signingStatus).toBe(
        SigningStatus.SIGNED,
      );
      expect(after.fields.find((field) => field.id === f.aliceField.id)?.signature?.typedSignature).toBe(
        'A-08 concurrent signature',
      );
      expect(after.fields.filter((field) => field.recipientId === f.bob.id)).toEqual(
        before.fields.filter((field) => field.recipientId === f.bob.id),
      );
      expect(after.recipients.find((recipient) => recipient.id === f.bob.id)).toEqual(f.bob);
      expect(after.auditCount).toBe(before.auditCount);
    } finally {
      await pending.response?.catch(() => undefined);
    }
  });
}
