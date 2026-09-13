import { beforeEach, expect, it, vi } from 'vitest';
import { compileMcaTemplate } from '../../templates/compile';
import { providerFixture } from '../../templates/profile.fixture';
import { emptyMcaDraftInput } from '../input';

const mocks = vi.hoisted(() => ({ preview: vi.fn() }));
vi.mock('../../templates/server-only/service', () => ({ previewMcaTemplate: mocks.preview }));

import { prepareMcaDraft } from './prepare';

const input = { userId: 31, teamId: 17, id: 'test-template', version: 1, draft: emptyMcaDraftInput() };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.preview.mockResolvedValue({ ...compileMcaTemplate(providerFixture()), currentRevision: 1 });
});
it('requires the shared live team, draft-access and content checks before filling or exporting', async () => {
  mocks.preview.mockRejectedValue(new Error('access revoked'));
  await expect(prepareMcaDraft(input)).rejects.toThrow('access revoked');
  expect(mocks.preview).toHaveBeenCalledWith(input);
});
it('refuses an older revision for a new transaction even if its legal content is unchanged', async () => {
  mocks.preview.mockResolvedValue({ ...compileMcaTemplate(providerFixture()), currentRevision: 2 });
  await expect(prepareMcaDraft(input)).rejects.toThrow('latest provider template revision');
});
it('fills only the server-resolved template and returns its revision identity', async () => {
  const result = await prepareMcaDraft(input);
  expect(result).toMatchObject({ templateId: input.id, version: 1, readyToSend: false });
  expect(result.documents[0].items.find((item) => item.slug === 'frpa.party-identification')?.body).toContain(
    'Example Receipts Inc.',
  );
});
