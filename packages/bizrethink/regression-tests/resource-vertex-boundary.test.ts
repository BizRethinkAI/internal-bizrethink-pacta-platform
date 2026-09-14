import { detectRecipientsFromPdf } from '@documenso/lib/server-only/ai/envelope/detect-recipients';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ render: vi.fn(), generate: vi.fn(), reserve: vi.fn(), consume: vi.fn() }));
vi.mock('@documenso/lib/server-only/ai/google', () => ({ vertex: vi.fn(() => 'synthetic-model') }));
vi.mock('@documenso/lib/server-only/ai/pdf-to-images', () => ({ pdfToImages: mocks.render }));
vi.mock('ai', () => ({ generateObject: mocks.generate }));
const signal = new AbortController().signal;
const budget = { signal, remainingPages: () => 3, consumePages: mocks.consume, reserveProviderCalls: mocks.reserve };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.render.mockResolvedValue([{ image: Buffer.from('synthetic'), pageNumber: 1 }]);
  mocks.generate.mockResolvedValue({ object: { recipients: [] } });
});
it('A-10 counts actual rendered pages and provider calls against the shared request budget', async () => {
  await detectRecipientsFromPdf({ pdfBytes: new Uint8Array([1]), budget } as Parameters<
    typeof detectRecipientsFromPdf
  >[0]);
  expect(mocks.render).toHaveBeenCalledWith(expect.any(Uint8Array), { maxPages: 3 });
  expect(mocks.consume).toHaveBeenCalledWith(1);
  expect(mocks.reserve).toHaveBeenCalledWith(1);
  expect(mocks.generate).toHaveBeenCalledWith(
    expect.objectContaining({ maxOutputTokens: 4096, maxRetries: 0, abortSignal: signal }),
  );
});
it('A-10 does not call the provider when the shared budget is exhausted', async () => {
  mocks.reserve.mockRejectedValue(new Error('Budget exhausted'));
  await expect(
    detectRecipientsFromPdf({ pdfBytes: new Uint8Array([1]), budget } as Parameters<typeof detectRecipientsFromPdf>[0]),
  ).rejects.toThrow('Budget exhausted');
  expect(mocks.generate).not.toHaveBeenCalled();
});
