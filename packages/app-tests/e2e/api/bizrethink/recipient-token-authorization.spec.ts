/** A-05: real HTTP, signed login cookies, PostgreSQL and PDF bytes; CI test data only. */
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { mapSecondaryIdToDocumentId } from '@documenso/lib/utils/envelope';
import { prisma } from '@documenso/prisma';
import { seedPendingDocument } from '@documenso/prisma/seed/documents';
import { seedDirectTemplate } from '@documenso/prisma/seed/templates';
import { seedUser } from '@documenso/prisma/seed/users';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { DocumentStatus, FieldType, SigningStatus } from '@prisma/client';

const baseURL = NEXT_PUBLIC_WEBAPP_URL();
type Seed = Awaited<ReturnType<typeof seedUser>>;
type AuthFixture = {
  sender: Seed;
  recipient: Seed;
  anonymous: APIRequestContext;
  intended: APIRequestContext;
  unrelated: APIRequestContext;
};

const signIn = async (request: APIRequestContext, email: string) => {
  const csrf = await request.get('/api/auth/csrf');
  expect(csrf.ok()).toBe(true);
  const { csrfToken } = await csrf.json();
  const login = await request.post('/api/auth/email-password/authorize', {
    data: { email, password: 'password', csrfToken },
  });
  expect(login.ok()).toBe(true);
  const session = await request.get('/api/auth/session');
  expect((await session.json()).user?.email).toBe(email);
};

const test = base.extend<{ auth: AuthFixture }>({
  auth: async ({ playwright }, use) => {
    const [sender, recipient, other] = await Promise.all([seedUser(), seedUser(), seedUser()]);
    const [anonymous, intended, unrelated] = await Promise.all(
      [0, 1, 2].map(() => playwright.request.newContext({ baseURL })),
    );
    try {
      await signIn(intended, recipient.user.email);
      await signIn(unrelated, other.user.email);
      await use({ sender, recipient, anonymous, intended, unrelated });
    } finally {
      await Promise.all([anonymous.dispose(), intended.dispose(), unrelated.dispose()]);
    }
  },
});

const seed = async (auth: AuthFixture, account = true, actionPassword = false) => {
  const envelope = await seedPendingDocument(auth.sender.user, auth.sender.team.id, [auth.recipient.user], {
    internalVersion: 2,
    createDocumentOptions: {
      authOptions: {
        globalAccessAuth: account ? ['ACCOUNT'] : [],
        globalActionAuth: actionPassword ? ['PASSWORD'] : [],
      },
    },
  });
  const recipient = envelope.recipients[0];
  const field = await prisma.field.findFirstOrThrow({ where: { recipientId: recipient.id } });
  return { envelope, recipient, field, documentId: mapSecondaryIdToDocumentId(envelope.secondaryId) };
};
type Document = Awaited<ReturnType<typeof seed>>;

const trpc = (request: APIRequestContext, name: string, input: Record<string, unknown>, mutation = false) => {
  const data = JSON.stringify({ json: input });
  return mutation
    ? request.post(`/api/trpc/${name}`, { headers: { 'content-type': 'application/json' }, data })
    : request.get(`/api/trpc/${name}?input=${encodeURIComponent(data)}`);
};
const expectError = async (response: APIResponse, code: string) => {
  expect(response.ok()).toBe(false);
  expect((await response.json()).error.json.data.code).toBe(code);
};
const expectOk = async (response: APIResponse) => {
  expect(response.ok(), await response.text()).toBe(true);
};
const pdfPaths = ({
  envelope,
  recipient,
}: {
  envelope: { id: string; envelopeItems: Array<{ id: string; documentDataId: string }> };
  recipient: { token: string };
}) => {
  const item = envelope.envelopeItems[0];
  return [
    `/api/files/token/${recipient.token}/envelopeItem/${item.id}`,
    `/api/files/token/${recipient.token}/envelopeItem/${item.id}/download/signed`,
    `/api/files/token/${recipient.token}/envelope/${envelope.id}/envelopeItem/${item.id}/dataId/${item.documentDataId}/current/item.pdf`,
  ];
};
const reads = ({ envelope, recipient }: Document): Array<[string, Record<string, unknown>]> => [
  ['envelope.item.getManyByToken', { envelopeId: envelope.id, access: { type: 'recipient', token: recipient.token } }],
  ['envelope.attachment.find', { envelopeId: envelope.id, token: recipient.token }],
  ['embeddingPresign.getMultiSignDocument', { token: recipient.token }],
  ['envelope.signingStatus', { token: recipient.token }],
];
const expectPdf = async (request: APIRequestContext, path: string) => {
  const response = await request.get(path);
  expect(response.status()).toBe(200);
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  expect(response.headers()['cache-control']).toContain('private');
  expect(response.headers()['cache-control']).toContain('no-store');
  return response;
};

const edits = ({ recipient, field }: Document): Array<[string, Record<string, unknown>]> => [
  ['field.removeSignedFieldWithToken', { token: recipient.token, fieldId: field.id }],
  ['field.signFieldWithToken', { token: recipient.token, fieldId: field.id, value: 'Authorized name' }],
  [
    'envelope.field.sign',
    { token: recipient.token, fieldId: field.id, fieldValue: { type: FieldType.NAME, value: null } },
  ],
  [
    'envelope.field.sign',
    { token: recipient.token, fieldId: field.id, fieldValue: { type: FieldType.NAME, value: 'Authorized name' } },
  ],
];

test('ACCOUNT protects every PDF and metadata adapter; authorized requests still work', async ({ auth }) => {
  const document = await seed(auth);
  await expectOk(await trpc(auth.intended, 'document.getDocumentByToken', { token: document.recipient.token }));
  for (const path of pdfPaths(document)) {
    const allowed = await expectPdf(auth.intended, path);
    for (const request of [auth.anonymous, auth.unrelated]) {
      const denied = await request.get(path, { headers: { 'If-None-Match': allowed.headers().etag ?? 'cached' } });
      expect(denied.status()).toBe(404);
      expect((await denied.body()).subarray(0, 5).toString()).not.toBe('%PDF-');
    }
  }
  for (const [name, input] of reads(document)) {
    for (const request of [auth.anonymous, auth.unrelated]) {
      await expectError(await trpc(request, name, input), 'UNAUTHORIZED');
    }
    await expectOk(await trpc(auth.intended, name, input));
  }
});

test('ACCOUNT gates legacy/v2 mutations and CSC entry before any signing side effects', async ({ auth }) => {
  const document = await seed(auth);
  const { recipient, documentId, field } = document;
  const mutationCases: Array<[string, Record<string, unknown>]> = [
    ...edits(document),
    ['recipient.completeDocumentWithToken', { token: recipient.token, documentId }],
    ['recipient.rejectDocumentWithToken', { token: recipient.token, documentId, reason: 'Denied test attempt' }],
    ['enterprise.csc.signEnvelope', { recipientToken: recipient.token, sessionId: 'invalid-test-session' }],
  ];
  for (const [name, input] of mutationCases) {
    // Exercise valid insert/remove preconditions, so these requests reach the
    // access gate rather than failing because an insert targets a filled field.
    const isInsertion =
      name === 'field.signFieldWithToken' ||
      (name === 'envelope.field.sign' && (input.fieldValue as { value: string | null }).value !== null);
    await prisma.field.update({ where: { id: field.id }, data: { inserted: !isInsertion } });
    for (const request of [auth.anonymous, auth.unrelated]) {
      await expectError(await trpc(request, name, input, true), 'UNAUTHORIZED');
      expect(await prisma.field.findUnique({ where: { id: field.id } })).toMatchObject({
        inserted: !isInsertion,
        customText: field.customText,
      });
    }
  }
  expect(await prisma.field.findUnique({ where: { id: field.id } })).toMatchObject({
    inserted: true,
    customText: field.customText,
  });
  expect(await prisma.recipient.findUnique({ where: { id: recipient.id } })).toMatchObject({
    signingStatus: SigningStatus.NOT_SIGNED,
  });
  expect(await prisma.signature.count({ where: { recipientId: recipient.id } })).toBe(0);
  expect(await prisma.documentAuditLog.count({ where: { envelopeId: document.envelope.id } })).toBe(0);
  for (const [name, input] of edits(document)) {
    await expectOk(await trpc(auth.intended, name, input, true));
  }
  await expectOk(
    await trpc(auth.intended, 'recipient.completeDocumentWithToken', { token: recipient.token, documentId }, true),
  );
  expect(await prisma.recipient.findUnique({ where: { id: recipient.id } })).toMatchObject({
    signingStatus: SigningStatus.SIGNED,
  });
  const rejection = await seed(auth);
  await expectOk(
    await trpc(
      auth.intended,
      'recipient.rejectDocumentWithToken',
      { token: rejection.recipient.token, documentId: rejection.documentId, reason: 'Authorized rejection' },
      true,
    ),
  );
  expect(await prisma.recipient.findUnique({ where: { id: rejection.recipient.id } })).toMatchObject({
    signingStatus: SigningStatus.REJECTED,
  });
});

test('deliberately link-only documents remain readable and signable anonymously', async ({ auth }) => {
  const document = await seed(auth, false);
  for (const path of pdfPaths(document)) {
    await expectPdf(auth.anonymous, path);
  }
  for (const [name, input] of reads(document)) {
    await expectOk(await trpc(auth.anonymous, name, input));
  }
  for (const [name, input] of edits(document)) {
    await expectOk(await trpc(auth.anonymous, name, input, true));
  }
  await expectOk(
    await trpc(
      auth.anonymous,
      'recipient.completeDocumentWithToken',
      { token: document.recipient.token, documentId: document.documentId },
      true,
    ),
  );
  expect(await prisma.recipient.findUnique({ where: { id: document.recipient.id } })).toMatchObject({
    signingStatus: SigningStatus.SIGNED,
  });
});

test('a signing deadline preserves authenticated downloads; deletion and draft state revoke reads', async ({
  auth,
}) => {
  const document = await seed(auth);
  await prisma.recipient.update({
    where: { id: document.recipient.id },
    data: { expiresAt: new Date('2000-01-01T00:00:00Z') },
  });
  for (const path of pdfPaths(document)) {
    await expectPdf(auth.intended, path);
  }
  const completion = await trpc(
    auth.intended,
    'recipient.completeDocumentWithToken',
    { token: document.recipient.token, documentId: document.documentId },
    true,
  );
  expect(completion.ok()).toBe(false);
  await expectError(completion, 'RECIPIENT_EXPIRED');
  for (const state of ['draft', 'deleted'] as const) {
    await prisma.envelope.update({
      where: { id: document.envelope.id },
      data: {
        status: state === 'draft' ? DocumentStatus.DRAFT : DocumentStatus.PENDING,
        deletedAt: state === 'deleted' ? new Date() : null,
      },
    });
    for (const path of pdfPaths(document)) {
      expect((await auth.intended.get(path)).status()).toBe(404);
    }
    await expectError(
      await trpc(auth.intended, 'document.getDocumentByToken', { token: document.recipient.token }),
      'NOT_FOUND',
    );
    for (const [name, input] of reads(document)) {
      await expectError(await trpc(auth.intended, name, input), 'NOT_FOUND');
    }
  }
});

test('sender deletion preserves the completed recipient copy with ACCOUNT still required', async ({ auth }) => {
  const document = await seed(auth);
  await prisma.envelope.update({
    where: { id: document.envelope.id },
    data: { status: DocumentStatus.COMPLETED, completedAt: new Date(), deletedAt: new Date() },
  });
  for (const path of pdfPaths(document)) {
    await expectPdf(auth.intended, path);
    expect((await auth.anonymous.get(path)).status()).toBe(404);
    expect((await auth.unrelated.get(path)).status()).toBe(404);
  }
  await expectOk(await trpc(auth.intended, 'document.getDocumentByToken', { token: document.recipient.token }));
  for (const [name, input] of reads(document)) {
    await expectOk(await trpc(auth.intended, name, input));
    await expectError(await trpc(auth.anonymous, name, input), 'UNAUTHORIZED');
    await expectError(await trpc(auth.unrelated, name, input), 'UNAUTHORIZED');
  }
});

for (const internalVersion of [1, 2] as const) {
  test(`V${internalVersion} direct-template PDFs retain their published-preview access contract`, async ({ auth }) => {
    const template = await seedDirectTemplate({
      userId: auth.sender.user.id,
      teamId: auth.sender.team.id,
      internalVersion,
      createTemplateOptions: { authOptions: { globalAccessAuth: [], globalActionAuth: [] } },
    });
    const items = await prisma.envelopeItem.findMany({ where: { envelopeId: template.id } });
    const recipient = template.recipients.find((entry) => entry.id === template.directLink?.directTemplateRecipientId);
    expect(recipient).toBeDefined();
    if (!recipient) {
      throw new Error('Seeded direct template is missing its placeholder recipient');
    }
    const paths = pdfPaths({ envelope: { ...template, envelopeItems: items }, recipient });
    for (const path of paths) {
      await expectPdf(auth.anonymous, path);
    }
    // A preview capability cannot read a document-only recipient API.
    await expectError(
      await trpc(auth.anonymous, 'envelope.item.getManyByToken', {
        envelopeId: template.id,
        access: { type: 'recipient', token: recipient.token },
      }),
      'NOT_FOUND',
    );
    await prisma.envelope.update({
      where: { id: template.id },
      data: { authOptions: { globalAccessAuth: ['ACCOUNT'], globalActionAuth: [] } },
    });
    for (const path of paths) {
      expect((await auth.anonymous.get(path)).status()).toBe(404);
      // Direct templates are forms for future recipients: ACCOUNT means a login.
      await expectPdf(auth.intended, path);
      await expectPdf(auth.unrelated, path);
    }
    await prisma.templateDirectLink.update({ where: { envelopeId: template.id }, data: { enabled: false } });
    for (const path of paths) {
      expect((await auth.intended.get(path)).status()).toBe(404);
    }
  });
}

test('ACCOUNT cannot substitute for a required completion code', async ({ auth }) => {
  const document = await seed(auth);
  await prisma.envelope.update({
    where: { id: document.envelope.id },
    data: { authOptions: { globalAccessAuth: ['ACCOUNT', 'TWO_FACTOR_AUTH'], globalActionAuth: [] } },
  });
  await expectError(
    await trpc(
      auth.intended,
      'recipient.completeDocumentWithToken',
      { token: document.recipient.token, documentId: document.documentId, accessAuthOptions: { type: 'ACCOUNT' } },
      true,
    ),
    'TWO_FACTOR_AUTH_FAILED',
  );
  expect(await prisma.recipient.findUnique({ where: { id: document.recipient.id } })).toMatchObject({
    signingStatus: SigningStatus.NOT_SIGNED,
  });
});

for (const fieldType of [FieldType.SIGNATURE, FieldType.FREE_SIGNATURE]) {
  test(`${fieldType} rejects another person's valid password, and accepts the recipient's`, async ({ auth }) => {
    const document = await seed(auth, false, true);
    await prisma.field.update({
      where: { id: document.field.id },
      data: { type: fieldType, inserted: false, customText: '' },
    });
    const input = {
      token: document.recipient.token,
      fieldId: document.field.id,
      value: 'Authorized signature',
      authOptions: { type: 'PASSWORD', password: 'password' },
    };
    await expectError(await trpc(auth.unrelated, 'field.signFieldWithToken', input, true), 'UNAUTHORIZED');
    await expectError(await trpc(auth.anonymous, 'field.signFieldWithToken', input, true), 'UNAUTHORIZED');
    expect(await prisma.signature.count({ where: { recipientId: document.recipient.id } })).toBe(0);
    await expectOk(await trpc(auth.intended, 'field.signFieldWithToken', input, true));
    expect(await prisma.signature.findFirst({ where: { fieldId: document.field.id } })).toMatchObject({
      recipientId: document.recipient.id,
      typedSignature: 'Authorized signature',
    });
  });
}

test('a valid recipient token cannot retrieve an item from another envelope', async ({ auth }) => {
  const first = await seed(auth);
  const second = await seed(auth);
  const token = first.recipient.token;
  const item = second.envelope.envelopeItems[0];
  expect((await auth.intended.get(`/api/files/token/${token}/envelopeItem/${item.id}`)).status()).toBe(404);
  await expectError(
    await trpc(auth.intended, 'envelope.item.getManyByToken', {
      envelopeId: second.envelope.id,
      access: { type: 'recipient', token },
    }),
    'NOT_FOUND',
  );
});
