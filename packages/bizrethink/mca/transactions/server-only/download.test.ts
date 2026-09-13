import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { beforeEach, expect, it, vi } from 'vitest';
import { emptyMcaDraftInput } from '../input';

const mocks = vi.hoisted(() => ({ session: vi.fn(), prepare: vi.fn(), render: vi.fn() }));
vi.mock('@documenso/auth/server/lib/utils/get-session', () => ({ getOptionalSession: mocks.session }));
vi.mock('./prepare', () => ({ prepareMcaDraft: mocks.prepare }));
vi.mock('./pdf', () => ({ renderMcaDraftPdf: mocks.render }));

import { downloadMcaDraftPdf } from './download';

const payload = { teamId: 17, id: 'template-one', version: 1, draft: emptyMcaDraftInput() };
const request = () =>
  new Request('https://example.invalid/api/bizrethink/mca-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ user: { id: 31 } });
  mocks.prepare.mockResolvedValue({ readyToSend: false });
  mocks.render.mockResolvedValue(Buffer.from('%PDF-test'));
});
it.each([
  [AppErrorCode.NOT_FOUND, 404],
  [AppErrorCode.FORBIDDEN, 403],
  [AppErrorCode.INVALID_REQUEST, 400],
])('preserves the %s denial status instead of returning a successful download', async (code, status) => {
  mocks.prepare.mockRejectedValue(new AppError(code, { message: 'Draft unavailable' }));
  const response = await downloadMcaDraftPdf(request());
  expect(response.status).toBe(status);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect(mocks.render).not.toHaveBeenCalled();
});
it('does not parse or render a request without an authenticated session', async () => {
  mocks.session.mockResolvedValue({ user: null });
  expect((await downloadMcaDraftPdf(request())).status).toBe(401);
  expect(mocks.prepare).not.toHaveBeenCalled();
});
it('returns a private attachment using server-resolved content and identity', async () => {
  const response = await downloadMcaDraftPdf(request());
  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toBe('application/pdf');
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="mca-internal-draft.pdf"');
  expect(mocks.prepare).toHaveBeenCalledWith({ ...payload, userId: 31 });
});
