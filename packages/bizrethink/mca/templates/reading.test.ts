import { describe, expect, it } from 'vitest';
import { ALL_MCA_CONTENT } from '../catalogue';
import { allOptionsTemplateFixture } from './all-options.fixture';
import { isMcaTemplateCurrent } from './compile';
import { projectTemplateReading } from './reading';

describe('compiled package reading metadata', () => {
  it('preserves saved fingerprints and the exact words of every document', () => {
    const template = allOptionsTemplateFixture();
    const before = JSON.stringify(template);
    const projected = projectTemplateReading(template);

    expect(projected.fingerprint).toBe(template.fingerprint);
    expect(isMcaTemplateCurrent(projected)).toBe(true);
    // Projecting must not mutate what it projects: a reading is a view of a
    // saved revision, and a revision is never edited.
    expect(JSON.stringify(template)).toBe(before);

    for (const document of projected.documents) {
      for (const item of document.items) {
        expect(item.reading?.segments.map((part) => part.text).join(''), item.slug).toBe(item.body);
      }
    }
  });

  it('refuses a changed body rather than normalizing away a saved-wording mismatch', () => {
    const template = allOptionsTemplateFixture();
    const item = template.documents
      .flatMap((document) => document.items)
      .find((entry) => entry.slug === 'frpa.definitions');
    const source = ALL_MCA_CONTENT.find((entry) => entry.slug === 'frpa.definitions');
    expect(source?.body).toContain('[[clause:');
    if (!item || !source) {
      throw new Error('The referenced definitions fixture is required.');
    }
    item.body = source.body;
    expect(() => projectTemplateReading(template)).toThrow(
      'The reading projection no longer matches this saved wording.',
    );
  });
});
