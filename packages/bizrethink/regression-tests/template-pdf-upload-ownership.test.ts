import { logger } from '@documenso/lib/utils/logger';
import type { DocumentData } from '@prisma/client';
import { DocumentDataType } from '@prisma/client';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { filesRoute } from '../../../apps/remix/server/api/files/files';
import type { HonoEnv } from '../../../apps/remix/server/router';

const { db, getSession, verifyPresign, putFile } = vi.hoisted(() => ({
  db: { bizrethinkPdfUpload: { create: vi.fn() } },
  getSession: vi.fn(),
  verifyPresign: vi.fn(),
  putFile: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/auth/server/lib/utils/get-session', () => ({ getOptionalSession: getSession }));
vi.mock('@documenso/lib/server-only/embedding-presign/verify-embedding-presign-token', () => ({
  verifyEmbeddingPresignToken: verifyPresign,
}));
vi.mock('@documenso/lib/universal/upload/put-file.server', () => ({ putNormalizedPdfFileServerSide: putFile }));
const uploaded: DocumentData = {
  id: 'new_upload',
  type: DocumentDataType.BYTES_64,
  data: 'synthetic-pdf',
  initialData: 'synthetic-pdf',
};
const app = new Hono<HonoEnv>()
  .use('*', async (c, next) => {
    c.set('logger', logger);
    await next();
  })
  .route('/', filesRoute);
const upload = (authorization?: string) => {
  const body = new FormData();
  body.set('file', new File(['%PDF-synthetic'], 'test.pdf', { type: 'application/pdf' }));
  body.set('userId', '999');
  body.set('teamId', '999');
  return app.request('/upload-pdf', { method: 'POST', body, headers: authorization ? { authorization } : {} });
};
beforeEach(() => {
  vi.clearAllMocks();
  logger.level = 'silent';
  getSession.mockResolvedValue({ user: { id: 7 }, session: { id: 'session_test' } });
  verifyPresign.mockResolvedValue({ userId: 7, teamId: 10 });
  putFile.mockResolvedValue(uploaded);
  db.bizrethinkPdfUpload.create.mockResolvedValue({});
});
describe('A-04 real upload adapter', () => {
  it('records the authenticated uploader before returning the data ID', async () => {
    const response = await upload();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: uploaded.id });
    expect(db.bizrethinkPdfUpload.create).toHaveBeenCalledWith({
      data: {
        documentDataId: uploaded.id,
        userId: 7,
        teamId: null,
        fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    });
  });
  it('retains the verified presign team when recording the uploader', async () => {
    getSession.mockResolvedValue({ user: null, session: null });
    expect((await upload('Bearer synthetic-presign')).status).toBe(200);
    expect(db.bizrethinkPdfUpload.create).toHaveBeenCalledWith({
      data: {
        documentDataId: uploaded.id,
        userId: 7,
        teamId: 10,
        fingerprint: expect.any(String),
      },
    });
  });
  it('does not return a usable upload response when ownership persistence fails', async () => {
    db.bizrethinkPdfUpload.create.mockRejectedValue(new Error('Synthetic database outage'));
    const response = await upload();
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain(uploaded.id);
  });
  it('preserves anonymous upload denial before storage', async () => {
    getSession.mockResolvedValue({ user: null, session: null });
    expect((await upload()).status).toBe(401);
    expect(putFile).not.toHaveBeenCalled();
    expect(db.bizrethinkPdfUpload.create).not.toHaveBeenCalled();
  });
  it('preserves invalid presign denial before storage', async () => {
    getSession.mockResolvedValue({ user: null, session: null });
    verifyPresign.mockRejectedValue(new Error('Invalid synthetic token'));
    expect((await upload('Bearer invalid')).status).toBe(401);
    expect(putFile).not.toHaveBeenCalled();
  });
});
