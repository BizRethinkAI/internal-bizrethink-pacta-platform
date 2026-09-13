import { describe, expect, it } from 'vitest';
import { allOptionsDraftFixture } from './draft.fixture';
import { fillMcaDraft } from './fill';

describe('missing input navigation', () => {
  it('identifies the actual repeated guarantor and report-subject input instead of the first matching label', () => {
    const { template, input } = allOptionsDraftFixture();
    input.guarantors.frpa.push({ ...input.guarantors.frpa[0], legalName: '', email: '' });
    input.reportSubjects[1].reportingAgency = '';
    const result = fillMcaDraft(template, input);
    expect(result.missing).toContainEqual(expect.objectContaining({ inputPath: 'guarantors.frpa.1.legalName' }));
    expect(result.missing).toContainEqual(expect.objectContaining({ inputPath: 'reportSubjects.1.reportingAgency' }));
    expect(result.missing.every((missing) => Boolean(missing.inputPath))).toBe(true);
  });
});
