import { expect, it, vi } from 'vitest';

// Shared constants expose lazy server-config imports to Vite's client graph.
// Their diagnostic policy must not require a named Node crypto export to bind.
vi.mock('node:crypto', () => ({}));

it('keeps SHA-256 correlation and redaction without Node-only crypto exports', async () => {
  const { safeLogRecord } = await import('../server-only/logging/safe-log-data');
  const record = safeLogRecord({
    envelopeId: 'abc',
    input: { token: 'synthetic-runtime-bearer' },
  });

  expect(record.envelopeId).toBe('sha256:ba7816bf8f01cfea414140de');
  expect(JSON.stringify(record)).not.toContain('synthetic-runtime-bearer');
});
