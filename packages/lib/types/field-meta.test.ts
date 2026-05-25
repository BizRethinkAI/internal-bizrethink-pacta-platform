import { describe, expect, it } from 'vitest';

import { ZDateFieldMeta, ZSignatureFieldMeta } from './field-meta';

/**
 * Regression tests for BizRethink overlays 034 (signature width/height)
 * + 035 (date fontWeight). These two metadata extensions are silent-
 * failure risks per MERGE-MANIFEST §3: if upstream's new `overflow` system
 * accidentally strips these schemas during the merge, signed PDFs will
 * still render but with wrong sizing / weight — a regression no smoke
 * test would catch without explicit assertion.
 */

describe('ZSignatureFieldMeta — overlay 034 (width + height)', () => {
  it('accepts width within [40, 600] range', () => {
    const parsed = ZSignatureFieldMeta.parse({ type: 'signature', width: 240, height: 30 });
    expect(parsed.width).toBe(240);
    expect(parsed.height).toBe(30);
  });

  it('coerces string number to number', () => {
    const parsed = ZSignatureFieldMeta.parse({ type: 'signature', width: '320' as never });
    expect(parsed.width).toBe(320);
  });

  it('rejects width below 40', () => {
    const result = ZSignatureFieldMeta.safeParse({ type: 'signature', width: 39 });
    expect(result.success).toBe(false);
  });

  it('rejects width above 600 (anti-abuse cap)', () => {
    const result = ZSignatureFieldMeta.safeParse({ type: 'signature', width: 601 });
    expect(result.success).toBe(false);
  });

  it('rejects height below 20', () => {
    const result = ZSignatureFieldMeta.safeParse({ type: 'signature', height: 19 });
    expect(result.success).toBe(false);
  });

  it('rejects height above 200', () => {
    const result = ZSignatureFieldMeta.safeParse({ type: 'signature', height: 201 });
    expect(result.success).toBe(false);
  });

  it('both width and height are optional', () => {
    const parsed = ZSignatureFieldMeta.parse({ type: 'signature' });
    expect(parsed.width).toBeUndefined();
    expect(parsed.height).toBeUndefined();
  });
});

describe('ZDateFieldMeta — overlay 035 (fontWeight)', () => {
  it('accepts fontWeight="normal"', () => {
    const parsed = ZDateFieldMeta.parse({ type: 'date', fontWeight: 'normal' });
    expect(parsed.fontWeight).toBe('normal');
  });

  it('accepts fontWeight="bold"', () => {
    const parsed = ZDateFieldMeta.parse({ type: 'date', fontWeight: 'bold' });
    expect(parsed.fontWeight).toBe('bold');
  });

  it('rejects unknown fontWeight value', () => {
    const result = ZDateFieldMeta.safeParse({ type: 'date', fontWeight: 'extra-bold' });
    expect(result.success).toBe(false);
  });

  it('fontWeight is optional (defaults to undefined)', () => {
    const parsed = ZDateFieldMeta.parse({ type: 'date' });
    expect(parsed.fontWeight).toBeUndefined();
  });
});
