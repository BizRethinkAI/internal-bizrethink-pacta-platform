import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as AUTHORITIES from '../instance/authorities';
import type { Authority, Jurisdiction } from '../instance/types';

/*
  Every quotation in the package must actually be in the statute it names.

  This is the check that keeps tier discipline honest. An identity is only
  authority-backed if its quotations are real; without this test a plausible
  paraphrase would sit in the registry looking exactly like a quotation and
  lending its weight to a reading nobody verified. That is the defect REVIEW-01
  found in the inherited documents, and it is cheap to make impossible.
*/

const SOURCES = join(__dirname, '../sources');
const cache = new Map<string, string>();
const norm = (s: string) => s.replace(/\s+/g, ' ');

const source = (file: string): string => {
  const hit = cache.get(file);

  if (hit !== undefined) {
    return hit;
  }

  const text = norm(readFileSync(join(SOURCES, file), 'utf8'));
  cache.set(file, text);

  return text;
};

const entries = Object.entries(AUTHORITIES) as [string, Record<Jurisdiction, Authority>][];

describe('every quoted authority appears verbatim in its own vendored source', () => {
  it('covers both states for every entry', () => {
    expect(entries.length).toBeGreaterThan(0);

    for (const [name, byState] of entries) {
      expect(Object.keys(byState).sort(), `${name}`).toEqual(['CA', 'NY']);
    }
  });

  for (const [name, byState] of entries) {
    for (const jurisdiction of ['CA', 'NY'] as const) {
      it(`${name}.${jurisdiction} — ${byState[jurisdiction].citation}`, () => {
        const authority = byState[jurisdiction];

        expect(authority.jurisdiction).toBe(jurisdiction);
        expect(source(authority.sourceFile).includes(norm(authority.text))).toBe(true);
      });
    }
  }
});

describe('the jurisdiction axis holds', () => {
  it('never files a California citation under New York, or the reverse', () => {
    for (const [name, byState] of entries) {
      expect(byState.CA.sourceFile, name).toBe('CA-10CCR-900-956.txt');
      expect(byState.NY.sourceFile, name).toBe('NY-23NYCRR-600.txt');
      expect(/NYCRR/i.test(byState.CA.citation), `${name}.CA cites NY`).toBe(false);
      expect(/CCR\s*§/.test(byState.NY.citation), `${name}.NY cites CA`).toBe(false);
    }
  });
});
