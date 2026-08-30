import { describe, expect, it } from 'vitest';

import { describeAiError } from '../ai/providers';

/**
 * Saying what actually went wrong.
 *
 * A Gemini key worked and an Anthropic key did not, and the message said only
 * "The anthropic API returned 404." — which is every failure at once: a wrong
 * model name, a revoked key, a key from the wrong product, an exhausted quota.
 * The provider had said exactly which; we threw it away.
 *
 * It was thrown away for a reason. Gemini takes its key IN THE URL, so echoing
 * a raw error body risks echoing the credential. The fix is not to dump the
 * body but to extract the one field both providers put the reason in — and
 * then to redact anything that still looks like the key, because a rule that
 * depends on a provider never quoting the request is a rule that holds until
 * it does not.
 */

describe('describeAiError', () => {
  it('reads the Anthropic error message', () => {
    const body = { type: 'error', error: { type: 'not_found_error', message: 'model: claude-sonnet-5' } };

    expect(describeAiError(404, body, 'SECRET')).toContain('model: claude-sonnet-5');
  });

  it('reads the Gemini error message', () => {
    const body = {
      error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' },
    };

    expect(describeAiError(400, body, 'SECRET')).toContain('API key not valid');
  });

  it('always states the status too, so a silent shape change is still visible', () => {
    expect(describeAiError(429, { error: { message: 'rate limited' } }, 'k')).toContain('429');
  });

  it('falls back to the status alone when it does not recognise the body', () => {
    const message = describeAiError(500, '<html>gateway error</html>', 'k');

    expect(message).toContain('500');
    expect(message).not.toContain('html');
  });

  it('REDACTS the key if the provider echoed it back', () => {
    // Gemini takes the key in the URL and may quote the request. This is the
    // guard that makes surfacing the message safe at all.
    const key = 'AIzaSyD-EXAMPLE-not-a-real-key-000000000';
    const body = { error: { message: `Invalid request to ?key=${key} here` } };
    const message = describeAiError(400, body, key);

    expect(message).not.toContain(key);
    expect(message).toContain('[redacted]');
  });

  it('redacts even when the key appears with different surrounding text', () => {
    const key = 'sk-ant-api03-EXAMPLE-not-a-real-key-0000';
    const body = { error: { message: `key ${key} is invalid` } };

    expect(describeAiError(401, body, key)).not.toContain(key);
  });

  it('does not redact a string too short to be a credential', () => {
    /*
      Caught by the test below during development: with the key "k", the guard
      rewrote "The API key was not accepted" as "The API [redacted]ey was not
      accepted". A one-character key is a substring of ordinary English, and
      redacting it corrupts every message it touches while protecting nothing.
    */
    const body = { error: { message: 'The API key was not accepted.' } };

    expect(describeAiError(401, body, 'k')).toContain('API key was not accepted');
  });

  it('still redacts a credential-length key', () => {
    const key = 'sk-ant-api03-EXAMPLE-not-a-real-key-0000';
    const body = { error: { message: `bad key ${key}` } };

    expect(describeAiError(401, body, key)).not.toContain(key);
  });

  it('never redacts on an empty key, which would blank the whole message', () => {
    const body = { error: { message: 'something went wrong' } };

    expect(describeAiError(400, body, '')).toContain('something went wrong');
  });

  it('caps the length, so a provider cannot fill the screen', () => {
    const body = { error: { message: 'x'.repeat(5000) } };

    expect(describeAiError(400, body, 'k').length).toBeLessThan(500);
  });

  it('says something useful about the common statuses even without a body', () => {
    expect(describeAiError(401, null, 'k').toLowerCase()).toMatch(/key/);
    expect(describeAiError(404, null, 'k').toLowerCase()).toMatch(/model|not found/);
    expect(describeAiError(429, null, 'k').toLowerCase()).toMatch(/rate|quota/);
  });
});
