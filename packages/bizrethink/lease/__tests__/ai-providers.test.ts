import { describe, expect, it } from 'vitest';

import { AI_PROVIDERS, buildAiRequest, extractAiText } from '../ai/providers';

/**
 * Talking to whichever model the instance is configured for.
 *
 * WHY THIS REPLACED A VERTEX-SHAPED CONFIG. The admin page asked for a GCP
 * project ID, a location AND an API key. Those belong to two different
 * products: the Gemini API takes an API key and nothing else, while Vertex
 * proper needs a project, a location and a service account. Collecting all
 * three meant two of the fields could never be load-bearing — and they
 * weren't, because the config was forward scaffolding written in May 2026
 * against an upstream AI feature that never shipped, and nothing read it
 * until now.
 *
 * A key is all either provider needs. Anthropic is here because the house
 * stack keeps Claude as the fallback.
 */

describe('the provider list', () => {
  it('offers exactly the two providers a key alone can reach', () => {
    expect([...AI_PROVIDERS].sort()).toEqual(['anthropic', 'gemini']);
  });
});

describe('buildAiRequest', () => {
  it('puts the Gemini key in the query string, where that API wants it', () => {
    const request = buildAiRequest('gemini', 'KEY123', 'draft me a clause');

    expect(request.url).toContain('generativelanguage.googleapis.com');
    expect(request.url).toContain('key=KEY123');
    expect(JSON.stringify(request.body)).toContain('draft me a clause');
  });

  it('puts the Anthropic key in a header, and never in the URL', () => {
    const request = buildAiRequest('anthropic', 'KEY123', 'draft me a clause');

    expect(request.url).toBe('https://api.anthropic.com/v1/messages');
    expect(request.headers['x-api-key']).toBe('KEY123');
    // A key in a URL ends up in logs and proxies. It must not be there.
    expect(request.url).not.toContain('KEY123');
  });

  it('sends the Anthropic version header, without which the call is rejected', () => {
    expect(buildAiRequest('anthropic', 'k', 'p').headers['anthropic-version']).toBeTruthy();
  });

  it('escapes a key with URL-significant characters', () => {
    const request = buildAiRequest('gemini', 'a&b=c', 'p');

    expect(request.url).toContain('a%26b%3Dc');
  });

  it('asks Gemini for a low temperature, and does NOT send one to Anthropic', () => {
    /*
      Not symmetric, and the asymmetry is forced. The current Claude models
      REJECT `temperature` — `400: \`temperature\` is deprecated for this
      model` — so sending it fails the whole request rather than being ignored.
      Found in production once the error surfacing from #43 made the reason
      visible; before that it read as a bare 400.

      The intent survives elsewhere: the prompt pins the output to a fixed JSON
      shape and forbids commentary, and parseClauseDraft discards anything that
      strays. A lease clause is still not the place for invention.
    */
    expect(JSON.stringify(buildAiRequest('gemini', 'k', 'p').body)).toMatch(/temperature/);

    expect(
      JSON.stringify(buildAiRequest('anthropic', 'k', 'p').body),
      'Anthropic rejects `temperature` outright; sending it 400s the request.',
    ).not.toMatch(/temperature/);
  });
});

describe('extractAiText', () => {
  it('reads a Gemini response', () => {
    const payload = { candidates: [{ content: { parts: [{ text: '{"heading":"x"}' }] } }] };

    expect(extractAiText('gemini', payload)).toBe('{"heading":"x"}');
  });

  it('joins multi-part Gemini output rather than taking only the first', () => {
    const payload = { candidates: [{ content: { parts: [{ text: '{"a":' }, { text: '1}' }] } }] };

    expect(extractAiText('gemini', payload)).toBe('{"a":1}');
  });

  it('reads an Anthropic response', () => {
    const payload = { content: [{ type: 'text', text: '{"heading":"x"}' }] };

    expect(extractAiText('anthropic', payload)).toBe('{"heading":"x"}');
  });

  it('ignores non-text Anthropic blocks', () => {
    const payload = {
      content: [
        { type: 'thinking', thinking: 'hmm' },
        { type: 'text', text: 'real' },
      ],
    };

    expect(extractAiText('anthropic', payload)).toBe('real');
  });

  it('returns empty string rather than throwing on a shape it does not know', () => {
    // A provider changing its response shape must degrade to "the model said
    // nothing", which the parse then reports cleanly — not a 500.
    for (const provider of AI_PROVIDERS) {
      expect(extractAiText(provider, {})).toBe('');
      expect(extractAiText(provider, null)).toBe('');
    }
  });
});
