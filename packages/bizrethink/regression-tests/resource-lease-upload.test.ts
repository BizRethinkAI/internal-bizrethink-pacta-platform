import { beforeEach, expect, it, vi } from 'vitest';
import { action } from '../../../apps/remix/app/routes/api+/bizrethink.lease-document';

const { db, countPages, store } = vi.hoisted(() => ({
  db: {
    organisation: { findMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    bizrethinkProperty: { findFirst: vi.fn() },
    bizrethinkLeaseMatter: { findFirst: vi.fn() },
    bizrethinkDocument: { findFirst: vi.fn(), create: vi.fn() },
    documentData: { create: vi.fn() },
    bizrethinkOrganisationBilling: { findUnique: vi.fn() },
    rateLimit: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
  countPages: vi.fn(),
  store: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/auth/server/lib/utils/get-session', () => ({ getSession: async () => ({ user: { id: 7 } }) }));
vi.mock('@cantoo/pdf-lib', () => ({ PDFDocument: { load: countPages } }));
vi.mock('@bizrethink/customizations/server-only/resources/media-worker', () => ({
  countBoundedPdfPages: async () => (await countPages()).getPageCount(),
  normalizeBoundedPdf: vi.fn(),
}));
vi.mock('@documenso/lib/universal/upload/put-file.server', () => ({ putFileServerSide: store }));
const upload = (headers: Record<string, string> = {}) => {
  const form = new FormData();
  form.set('file', new File(['%PDF-synthetic'], 'synthetic.pdf', { type: 'application/pdf' }));
  form.set('kind', 'hoa-governing');
  form.set('propertyId', 'property_test');
  form.set('label', 'Synthetic');
  const request = new Request('http://fixture.invalid/api/bizrethink.lease-document', {
    method: 'POST',
    body: form,
    headers,
  });
  return action({ request, params: {}, context: {} } as Parameters<typeof action>[0]);
};
beforeEach(() => {
  vi.resetAllMocks();
  db.organisation.findMany.mockResolvedValue([{ id: 'org_test' }]);
  db.organisation.findUniqueOrThrow.mockResolvedValue({ id: 'org_test', subscription: null });
  db.bizrethinkOrganisationBilling.findUnique.mockResolvedValue({ bizrethinkInternal: true });
  db.bizrethinkProperty.findFirst.mockResolvedValue({ organisationId: 'org_test' });
  db.bizrethinkDocument.create.mockResolvedValue({ id: 'attachment_test', pageCount: 1 });
  db.documentData.create.mockResolvedValue({ id: 'data_test' });
  db.rateLimit.upsert.mockResolvedValue({ count: 1 });
  db.$transaction.mockImplementation((operation) => operation(db));
  countPages.mockResolvedValue({ getPageCount: () => 1 });
  store.mockResolvedValue({ type: 'BYTES', data: 'synthetic' });
});
it('A-10 rejects an inaccessible property before PDF parsing or storage', async () => {
  db.bizrethinkProperty.findFirst.mockResolvedValue(null);
  expect((await upload()).status).toBe(400);
  expect(countPages).not.toHaveBeenCalled();
  expect(store).not.toHaveBeenCalled();
});
it('preserves a permitted attachment and its counted extent', async () => {
  const response = await upload();
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ document: { id: 'attachment_test', pageCount: 1 } });
  expect(countPages).toHaveBeenCalledOnce();
  expect(store).toHaveBeenCalledOnce();
});
