import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { callAi, draftClause } from '../lease/server-only/draft-clause';

const { db, config } = vi.hoisted(() => ({
  db: {
    user: { findFirst: vi.fn() },
    organisation: { findFirst: vi.fn(), findUniqueOrThrow: vi.fn() },
    bizrethinkOrganisationBilling: { findUnique: vi.fn() },
    rateLimit: { upsert: vi.fn() },
    bizrethinkResourceLease: { count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
  config: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('../server-only/instance-ai-config', () => ({ getResolvedAiConfig: config }));
const fetchMock = vi.fn<typeof fetch>();
const prompt = {
  request: 'Draft a synthetic fixture',
  sections: ['rent'],
  actor: { userId: 7, organisationId: 'org_test' },
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  config.mockResolvedValue({ provider: 'gemini', apiKey: 'synthetic' });
  db.user.findFirst.mockResolvedValue({ id: 7, roles: ['USER'], emailVerified: new Date() });
  db.organisation.findFirst.mockResolvedValue({ id: 'org_test' });
  db.organisation.findUniqueOrThrow.mockResolvedValue({ id: 'org_test', subscription: null });
  db.bizrethinkOrganisationBilling.findUnique.mockResolvedValue({ bizrethinkInternal: true });
  db.rateLimit.upsert.mockResolvedValue({ count: 1 });
  db.bizrethinkResourceLease.count.mockResolvedValue(0);
  db.bizrethinkResourceLease.create.mockResolvedValue({ id: 'lease_test' });
  db.$transaction.mockImplementation((operation) => operation(db));
  fetchMock.mockImplementation(async () =>
    Response.json({ candidates: [{ content: { parts: [{ text: 'ready' }] } }] }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('A-10 refuses an exhausted AI request budget before calling the provider', async () => {
  db.rateLimit.upsert.mockResolvedValue({ count: 1001 });
  await expect(draftClause(prompt)).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('A-10 refuses concurrent work when the durable lease capacity is full', async () => {
  db.bizrethinkResourceLease.count.mockResolvedValue(99);
  await expect(draftClause(prompt)).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('A-10 AI budget persistence failures never permit an unmetered provider call', async () => {
  db.rateLimit.upsert.mockRejectedValue(new Error('synthetic counter failure'));
  await expect(draftClause(prompt)).rejects.toThrow('synthetic counter failure');
  expect(fetchMock).not.toHaveBeenCalled();
});
it('A-10 refuses an oversized provider response before decoding JSON', async () => {
  fetchMock.mockResolvedValue(
    new Response('{"candidates":[]}', { headers: { 'content-length': String(3 * 1024 * 1024) } }),
  );
  expect(await callAi('gemini', 'synthetic', 'Synthetic')).toMatchObject({ ok: false, reason: 'call-failed' });
});
it('A-10 supplies a deadline signal to the provider fetch', async () => {
  await callAi('gemini', 'synthetic', 'Synthetic');
  const signal = fetchMock.mock.calls[0][1]?.signal;
  expect(signal).toBeInstanceOf(AbortSignal);
});
it('preserves a valid bounded provider response', async () => {
  expect(await callAi('gemini', 'synthetic', 'Synthetic')).toEqual({ ok: true, text: 'ready' });
});
