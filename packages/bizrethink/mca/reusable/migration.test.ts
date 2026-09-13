import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { ALL_MCA_CONTENT } from '../catalogue';
import { ALL_MCA_CLAUSES } from '../clauses/library';
import { ALL_MCA_REUSABLE } from './library';
import migration from './migration.json';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const bySlug = new Map(ALL_MCA_CONTENT.map((entry) => [entry.slug, entry]));

describe('the MCA catalogue extraction accounts for every input record', () => {
  it('keeps disjoint catalogues and every historical identity', () => {
    expect(migration.records).toHaveLength(211);
    expect(ALL_MCA_CLAUSES).toHaveLength(210);
    expect(ALL_MCA_REUSABLE).toHaveLength(25);
    expect(bySlug.size).toBe(ALL_MCA_CONTENT.length);
    expect(migration.records.every((row) => bySlug.has(row.sourceSlug))).toBe(true);
  });

  it.each(migration.records)('$sourceSlug: reconstructs the complete source wording', (row) => {
    // This proves extraction at its pinned destination versions. Later deliberate
    // drafting must advance the version; it must not restore source fidelity as
    // a permanent specification (ADR 0012). Missing or regressed versions fail.
    for (const segment of row.segments) {
      expect(bySlug.get(segment.target)?.version).toBeGreaterThanOrEqual(segment.targetVersion);
    }
    if (row.segments.some((segment) => bySlug.get(segment.target)?.version !== segment.targetVersion)) {
      return;
    }
    const text = row.segments
      .map((segment) => {
        const target = bySlug.get(segment.target);
        expect(target, segment.target).toBeDefined();
        if (segment.property === 'field-label' && 'binding' in segment) {
          const field = target?.fields?.find((candidate) => candidate.binding === segment.binding);
          expect(field?.legacyWidget).toBe(segment.legacyWidget);
          expect(segment.sourceText).toContain(segment.legacyWidget);
          return segment.sourceText;
        }
        return `${'prefix' in segment ? segment.prefix : ''}${segment.property === 'heading' ? target?.heading : target?.body}${'suffix' in segment ? segment.suffix : ''}`;
      })
      .join('');
    expect(hash(text)).toBe(row.bodyHash);
  });

  it('retains all current field definitions, repeat contexts and retired source slots', () => {
    for (const row of migration.records) {
      if (!('fieldTarget' in row) || !row.fieldTarget) {
        continue;
      }
      const target = bySlug.get(row.fieldTarget);
      expect(target?.version).toBeGreaterThanOrEqual(row.fieldTargetVersion);
      if (target?.version !== row.fieldTargetVersion) {
        continue;
      }
      expect(hash(JSON.stringify(target?.fields ?? []))).toBe(row.fieldsHash);
      expect(hash(JSON.stringify(target?.retiredFields ?? []))).toBe(row.retiredFieldsHash);
      expect(target?.repeatFor ?? null).toBe(row.repeatFor);
    }
  });

  it('makes document placement explicit and keeps interview prompts out of contracts', () => {
    for (const entry of ALL_MCA_REUSABLE) {
      expect(entry.uses.length).toBeGreaterThan(0);
      if (entry.kind === 'guidance') {
        expect(entry.uses).toEqual(['interview']);
        expect(entry.placement).toBeNull();
        continue;
      }
      expect(entry.uses).toContain('document');
      expect(entry.placement).not.toBeNull();
      if (entry.placement && 'before' in entry.placement) {
        expect(bySlug.has(entry.placement.before)).toBe(true);
      }
      if (entry.placement && 'after' in entry.placement) {
        expect(bySlug.has(entry.placement.after)).toBe(true);
      }
    }
  });

  it('extracts embedded numbered provisions from both equipment documents', () => {
    for (const instrument of ['equipment-lease', 'subscription']) {
      for (const suffix of ['jury-trial-waiver', 'class-and-representative-proceedings', 'limitation-of-actions']) {
        expect(bySlug.get(`${instrument}.${suffix}`)?.kind).toBe('clause');
      }
    }
    expect(ALL_MCA_CLAUSES.some((entry) => /^3\.15[ABC] /m.test(entry.body))).toBe(false);
  });
});
