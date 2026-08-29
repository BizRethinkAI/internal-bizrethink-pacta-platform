import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addVerificationFooterToPdf } from './add-verification-footer-to-pdf';

vi.mock('@documenso/lib/constants/app', () => ({
  NEXT_PRIVATE_INTERNAL_WEBAPP_URL: vi.fn(() => 'http://localhost:3000'),
}));

vi.mock('@libpdf/core', () => ({
  rgb: vi.fn((r: number, g: number, b: number) => ({ r, g, b, _kind: 'rgb' })),
}));

// Stub global fetch for the font load.
const FONT_BYTES = new Uint8Array([1, 2, 3, 4]);

const makePdf = () => {
  const drawCalls: Array<{ pageWidth: number; args: Record<string, unknown> }> = [];
  const fakeFont = {
    getTextWidth: vi.fn(() => 200), // text is 200pt wide for centering math
  };
  const makePage = (width: number) => ({
    width,
    drawText: vi.fn((text: string, args: Record<string, unknown>) => {
      drawCalls.push({ pageWidth: width, args: { ...args, text } });
    }),
  });
  const pages = [makePage(595), makePage(595), makePage(842)]; // 2 letter + 1 A4
  const pdf = {
    embedFont: vi.fn(() => fakeFont),
    getPages: vi.fn(() => pages),
  };
  return { pdf, pages, fakeFont, drawCalls };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-25T14:30:00.000Z'));
  global.fetch = vi.fn(async () => Promise.resolve(new Response(FONT_BYTES))) as unknown as typeof fetch;
});

afterEach(() => {
  vi.useRealTimers();
  delete (global as Record<string, unknown>).fetch;
});

describe('addVerificationFooterToPdf', () => {
  it('embeds font fetched from NEXT_PRIVATE_INTERNAL_WEBAPP_URL', async () => {
    const { pdf } = makePdf();
    await addVerificationFooterToPdf(pdf as never, { envelopeId: 'env-1' });
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/fonts/noto-sans.ttf');
    expect(pdf.embedFont).toHaveBeenCalledOnce();
  });

  it('draws footer text on every page', async () => {
    const { pdf, pages, drawCalls } = makePdf();
    await addVerificationFooterToPdf(pdf as never, { envelopeId: 'env-1' });
    expect(drawCalls.length).toBe(pages.length);
    expect(pages[0].drawText).toHaveBeenCalledOnce();
    expect(pages[1].drawText).toHaveBeenCalledOnce();
    expect(pages[2].drawText).toHaveBeenCalledOnce();
  });

  it('formats timestamp as UTC YYYY-MM-DD HH:MM (zero-padded)', async () => {
    const { pdf, drawCalls } = makePdf();
    await addVerificationFooterToPdf(pdf as never, {
      envelopeId: 'env-abc-123',
      completedAt: new Date('2026-01-05T07:08:00.000Z'),
    });
    const text = drawCalls[0].args.text as string;
    expect(text).toContain('2026-01-05 07:08 UTC');
    expect(text).toContain('Envelope env-abc-123');
  });

  it('defaults verificationDomain to sign.pacta.ink', async () => {
    const { pdf, drawCalls } = makePdf();
    await addVerificationFooterToPdf(pdf as never, { envelopeId: 'env-1' });
    expect(drawCalls[0].args.text).toContain('Verified by sign.pacta.ink');
  });

  it('uses custom verificationDomain when supplied', async () => {
    const { pdf, drawCalls } = makePdf();
    await addVerificationFooterToPdf(pdf as never, {
      envelopeId: 'env-1',
      verificationDomain: 'sign.example.com',
    });
    expect(drawCalls[0].args.text).toContain('Verified by sign.example.com');
  });

  it('defaults completedAt to current time when not supplied', async () => {
    const { pdf, drawCalls } = makePdf();
    await addVerificationFooterToPdf(pdf as never, { envelopeId: 'env-1' });
    // 2026-05-25T14:30:00Z (from fake timer) = "2026-05-25 14:30 UTC"
    expect(drawCalls[0].args.text).toContain('2026-05-25 14:30 UTC');
  });

  it('centers text horizontally on each page using getTextWidth', async () => {
    const { pdf, fakeFont, drawCalls } = makePdf();
    await addVerificationFooterToPdf(pdf as never, { envelopeId: 'env-1' });
    expect(fakeFont.getTextWidth).toHaveBeenCalledTimes(3);
    // Letter page (595pt wide) with 200pt text → x = (595 - 200) / 2 = 197.5
    expect(drawCalls[0].args.x).toBe(197.5);
    // A4 page (842pt wide) with 200pt text → x = (842 - 200) / 2 = 321
    expect(drawCalls[2].args.x).toBe(321);
  });

  it('draws at y=14pt with fontSize=6.5pt', async () => {
    const { pdf, drawCalls } = makePdf();
    await addVerificationFooterToPdf(pdf as never, { envelopeId: 'env-1' });
    expect(drawCalls[0].args.y).toBe(14);
    expect(drawCalls[0].args.size).toBe(6.5);
  });

  it('uses muted gray color (tailwind gray-500)', async () => {
    const { pdf, drawCalls } = makePdf();
    await addVerificationFooterToPdf(pdf as never, { envelopeId: 'env-1' });
    // rgb mock captures r/g/b values; gray-500 = (107, 114, 128) / 255
    const color = drawCalls[0].args.color as { r: number; g: number; b: number };
    expect(color.r).toBeCloseTo(107 / 255, 5);
    expect(color.g).toBeCloseTo(114 / 255, 5);
    expect(color.b).toBeCloseTo(128 / 255, 5);
  });

  it('returns the same pdf object passed in', async () => {
    const { pdf } = makePdf();
    const result = await addVerificationFooterToPdf(pdf as never, { envelopeId: 'env-1' });
    expect(result).toBe(pdf);
  });
});
