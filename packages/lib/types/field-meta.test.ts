import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DATE_OVERFLOW_MODE,
  DEFAULT_EMAIL_OVERFLOW_MODE,
  DEFAULT_SIGNATURE_OVERFLOW_MODE,
  FIELD_CHECKBOX_META_DEFAULT_VALUES,
  FIELD_DATE_META_DEFAULT_VALUES,
  FIELD_DROPDOWN_META_DEFAULT_VALUES,
  FIELD_EMAIL_META_DEFAULT_VALUES,
  FIELD_INITIALS_META_DEFAULT_VALUES,
  FIELD_NAME_META_DEFAULT_VALUES,
  FIELD_NUMBER_META_DEFAULT_VALUES,
  FIELD_RADIO_META_DEFAULT_VALUES,
  FIELD_SIGNATURE_META_DEFAULT_VALUES,
  FIELD_TEXT_META_DEFAULT_VALUES,
  resolveFieldOverflowMode,
  ZCheckboxFieldMeta,
  ZDateFieldMeta,
  ZDropdownFieldMeta,
  ZEmailFieldMeta,
  ZFieldOverflowMode,
  ZInitialsFieldMeta,
  ZNameFieldMeta,
  ZNumberFieldMeta,
  ZRadioFieldMeta,
  ZSignatureFieldMeta,
  ZTextFieldMeta,
} from './field-meta';

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

/**
 * Upstream-sync regression suite (added 2026-05-25 after PR #1 deploy fail).
 *
 * PR #1 broke Coolify because a take-ours/take-theirs merge left
 * `field-meta.ts` without upstream's new overflow system. Upstream code
 * still imported `resolveFieldOverflowMode` + `DEFAULT_*_OVERFLOW_MODE` +
 * `ZFieldOverflowMode`, and TypeScript blew up. These tests assert those
 * exports stay reachable AND that every FIELD_*_META_DEFAULT_VALUES
 * object passes its matching schema — so we catch:
 *
 *   - Future upstream rename/removal of overflow exports
 *   - Defaults including a key the schema rejects (or schema requiring
 *     a key defaults forgot)
 *
 * If any of these fail post-merge, fix the field-meta surface before
 * pushing. See UPSTREAM.md §"Pre-merge gates".
 */
describe('Field overflow system — upstream import surface', () => {
  it('ZFieldOverflowMode accepts the 4 known overflow values', () => {
    expect(ZFieldOverflowMode.safeParse('auto').success).toBe(true);
    expect(ZFieldOverflowMode.safeParse('horizontal').success).toBe(true);
    expect(ZFieldOverflowMode.safeParse('vertical').success).toBe(true);
    expect(ZFieldOverflowMode.safeParse('crop').success).toBe(true);
  });

  it('ZFieldOverflowMode rejects unknown values', () => {
    expect(ZFieldOverflowMode.safeParse('shrink').success).toBe(false);
    expect(ZFieldOverflowMode.safeParse('').success).toBe(false);
  });

  it('DEFAULT_*_OVERFLOW_MODE constants are valid overflow values', () => {
    expect(ZFieldOverflowMode.safeParse(DEFAULT_SIGNATURE_OVERFLOW_MODE).success).toBe(true);
    expect(ZFieldOverflowMode.safeParse(DEFAULT_DATE_OVERFLOW_MODE).success).toBe(true);
    expect(ZFieldOverflowMode.safeParse(DEFAULT_EMAIL_OVERFLOW_MODE).success).toBe(true);
  });

  it('resolveFieldOverflowMode returns overflow when set', () => {
    expect(resolveFieldOverflowMode({ overflow: 'horizontal' })).toBe('horizontal');
  });

  it('resolveFieldOverflowMode falls back to "crop" when fieldMeta is null/undefined', () => {
    expect(resolveFieldOverflowMode(null)).toBe('crop');
    expect(resolveFieldOverflowMode(undefined)).toBe('crop');
    expect(resolveFieldOverflowMode({})).toBe('crop');
  });
});

describe('Field defaults ↔ schema parity', () => {
  const pairs = [
    ['signature', FIELD_SIGNATURE_META_DEFAULT_VALUES, ZSignatureFieldMeta],
    ['date', FIELD_DATE_META_DEFAULT_VALUES, ZDateFieldMeta],
    ['email', FIELD_EMAIL_META_DEFAULT_VALUES, ZEmailFieldMeta],
    ['text', FIELD_TEXT_META_DEFAULT_VALUES, ZTextFieldMeta],
    ['number', FIELD_NUMBER_META_DEFAULT_VALUES, ZNumberFieldMeta],
    ['initials', FIELD_INITIALS_META_DEFAULT_VALUES, ZInitialsFieldMeta],
    ['name', FIELD_NAME_META_DEFAULT_VALUES, ZNameFieldMeta],
    ['radio', FIELD_RADIO_META_DEFAULT_VALUES, ZRadioFieldMeta],
    ['checkbox', FIELD_CHECKBOX_META_DEFAULT_VALUES, ZCheckboxFieldMeta],
    ['dropdown', FIELD_DROPDOWN_META_DEFAULT_VALUES, ZDropdownFieldMeta],
  ] as const;

  it.each(pairs)('%s defaults parse against schema without error', (_name, defaults, schema) => {
    const result = schema.safeParse(defaults);

    if (!result.success) {
      // Surface zod's per-field error list so a failure is actionable.
      throw new Error(`Defaults out of sync with schema: ${JSON.stringify(result.error.issues, null, 2)}`);
    }

    expect(result.success).toBe(true);
  });
});
