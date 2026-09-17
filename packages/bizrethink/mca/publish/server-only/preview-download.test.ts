import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  assertNotDisabled: vi.fn(),
  preview: vi.fn(),
  render: vi.fn(),
}));

vi.mock('@documenso/auth/server/lib/utils/get-session', () => ({ getOptionalSession: mocks.session }));
vi.mock('@documenso/lib/server-only/user/assert-user-not-disabled', () => ({
  assertUserNotDisabled: mocks.assertNotDisabled,
}));
vi.mock('../../templates/server-only/service', () => ({ previewMcaTemplate: mocks.preview }));
vi.mock('./specimen', () => ({ renderMcaTemplatePreviewPdf: mocks.render }));

import { downloadMcaTemplatePreview } from './preview-download';

const request = (body: unknown, method = 'POST') =>
  new Request('https://sign.pacta.ink/api/bizrethink/mca-template-preview', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });

const valid = { teamId: 17, id: 'mca-template', version: 2, instrument: 'frpa' };

beforeEach(() => {
  // resetAllMocks, not clearAllMocks: `clear` empties the call log but KEEPS an
  // implementation set with mockImplementation, so the throwing
  // assertUserNotDisabled from the disabled-account case leaked into every test
  // after it and turned two 400s into 500s.
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ user: { id: 41 } });
  mocks.preview.mockResolvedValue({ documents: [], profile: {}, version: 2 });
  mocks.render.mockResolvedValue(Buffer.from('%PDF-1.7 preview'));
});

/**
 * Downloading a preview of a template.
 *
 * ADR 0025: the artifact is a template and a deal never enters this vertical, so
 * there is nothing to fill in before previewing one. The whole request is which
 * template, which revision, which document — and the answer is that template
 * rendered with specimen values.
 *
 * WHAT IT DOES NOT DO IS DECIDE ACCESS. `previewMcaTemplate` already checks live
 * team membership, the separate `mca-clause-draft-rendering` grant, and that the
 * revision still compiles to what it compiled to. Repeating those here would be
 * two checks that can disagree.
 */
describe('a preview is one request: which template', () => {
  it('renders the named revision and returns it as a PDF', async () => {
    const response = await downloadMcaTemplatePreview(request(valid));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(mocks.preview).toHaveBeenCalledWith({ userId: 41, teamId: 17, id: 'mca-template', version: 2 });
  });

  it('asks the renderer for the instrument that was requested', async () => {
    await downloadMcaTemplatePreview(request({ ...valid, instrument: 'iso-pra' }));

    expect(mocks.render.mock.calls[0]?.[1]).toBe('iso-pra');
  });

  /**
   * A preview holds no merchant's details, but it does hold a funder's own
   * programme terms, and it is not something to leave in a shared cache.
   */
  it('is private and never stored', async () => {
    const response = await downloadMcaTemplatePreview(request(valid));

    expect(response.headers.get('Cache-Control')).toMatch(/private.*no-store/);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  /**
   * The filename says what it is. A file called `mca.pdf` sitting in somebody's
   * downloads folder a week later is exactly how a preview gets mistaken for the
   * thing it previews.
   */
  it('names the file a preview', async () => {
    const response = await downloadMcaTemplatePreview(request(valid));

    expect(response.headers.get('Content-Disposition')).toMatch(/preview/i);
  });
});

describe('it refuses what it cannot serve', () => {
  it('refuses anyone not signed in', async () => {
    mocks.session.mockResolvedValue({ user: null });

    expect((await downloadMcaTemplatePreview(request(valid))).status).toBe(401);
  });

  it('refuses a disabled account', async () => {
    mocks.assertNotDisabled.mockImplementation(() => {
      throw new Error('disabled');
    });

    expect((await downloadMcaTemplatePreview(request(valid))).status).toBeGreaterThanOrEqual(400);
  });

  it('refuses an instrument the builder does not produce', async () => {
    const response = await downloadMcaTemplatePreview(request({ ...valid, instrument: 'split-funding' }));

    expect(response.status).toBe(400);
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it('refuses a request that is not a template reference', async () => {
    expect((await downloadMcaTemplatePreview(request({ id: 'x' }))).status).toBe(400);
  });

  /**
   * The team is part of the reference, and membership is checked against it.
   * A request without one was accepted by the mocked test and caught only by
   * the type gate — `previewMcaTemplate` would have been called with no team.
   */
  it('refuses a reference with no team', async () => {
    const { teamId: _omitted, ...withoutTeam } = valid;

    expect((await downloadMcaTemplatePreview(request(withoutTeam))).status).toBe(400);
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it('answers POST only', async () => {
    expect((await downloadMcaTemplatePreview(request(valid, 'GET'))).status).toBe(405);
  });

  /**
   * `previewMcaTemplate` is where membership, the draft grant and revision
   * currency are decided. Whatever it refuses, this refuses — without
   * translating the reason into something more helpful than it should be.
   */
  it('passes on a refusal from the check that owns it', async () => {
    mocks.preview.mockRejectedValue(new Error('Internal draft preview access is required.'));

    const response = await downloadMcaTemplatePreview(request(valid));

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mocks.render).not.toHaveBeenCalled();
  });
});
