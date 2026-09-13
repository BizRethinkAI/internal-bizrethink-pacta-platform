import { describe, expect, it } from 'vitest';
import { allOptionsDraftFixture } from '../transactions/draft.fixture';
import { fillMcaDraft } from '../transactions/fill';
import { isMcaTemplateCurrent } from './compile';
import { projectTemplateReading } from './reading';

describe('compiled package reading metadata', () => {
  it('preserves saved fingerprints and exact filled words across repeated document instances', () => {
    const { template, input } = allOptionsDraftFixture();
    const before = JSON.stringify(template);
    const projected = projectTemplateReading(template);
    expect(projected.fingerprint).toBe(template.fingerprint);
    expect(isMcaTemplateCurrent(projected)).toBe(true);
    expect(JSON.stringify(template)).toBe(before);
    const filled = fillMcaDraft(projected, input);
    expect(filled.documents.filter((document) => document.instrument === 'permission-to-release')).toHaveLength(2);
    for (const document of filled.documents) {
      for (const item of document.items) {
        expect(item.reading?.segments.map((part) => part.text).join(''), item.slug).toBe(item.body);
      }
    }
  });
});
