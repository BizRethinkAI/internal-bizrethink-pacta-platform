import { describe, expect, it } from 'vitest';
import { readMcaDraftRequest } from './read-request';

describe('draft PDF inputs stay in a bounded JSON request body', () => {
  it('accepts JSON without putting transaction data in the URL', async () => {
    const request = new Request('https://example.invalid/api/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ reference: 'Synthetic transaction' }),
    });
    expect(await readMcaDraftRequest(request)).toEqual({ reference: 'Synthetic transaction' });
  });
  it('rejects a form submission even if its text looks like JSON', async () => {
    const request = new Request('https://example.invalid/api/draft', { method: 'POST', body: '{}' });
    await expect(readMcaDraftRequest(request)).rejects.toMatchObject({ statusCode: 415 });
  });
  it('stops reading an oversized stream even without a Content-Length header', async () => {
    let chunks = 0;
    let cancelled = false;
    const body = new ReadableStream({
      pull(controller) {
        chunks += 1;
        controller.enqueue(new Uint8Array(100_000));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request('https://example.invalid/api/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      duplex: 'half',
    } as RequestInit);
    await expect(readMcaDraftRequest(request)).rejects.toMatchObject({ statusCode: 413 });
    expect(cancelled).toBe(true);
    expect(chunks).toBeLessThanOrEqual(8);
  });
});
