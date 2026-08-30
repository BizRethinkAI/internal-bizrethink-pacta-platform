/**
 * Talking to whichever model the instance is configured for.
 *
 * WHY THIS REPLACED A VERTEX-SHAPED CONFIG. `/admin/ai` used to ask for a GCP
 * project ID, a location AND an API key. Those belong to two different
 * products: the Gemini API takes a key and nothing else, while Vertex proper
 * needs a project, a location and a service account. Collecting all three
 * meant at least two fields could never be load-bearing — and none of them
 * were, because the config was forward scaffolding written in May 2026 against
 * an upstream AI feature that never shipped. Nothing read it until the clause
 * drafter.
 *
 * A key is all either provider needs. Anthropic is here because the house
 * stack keeps Claude as the fallback.
 */

export const AI_PROVIDERS = ['gemini', 'anthropic'] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export const isAiProvider = (value: unknown): value is AiProvider =>
  typeof value === 'string' && (AI_PROVIDERS as readonly string[]).includes(value);

/** Cheap and fast; clause drafting is short and highly constrained. */
const MODEL: Record<AiProvider, string> = {
  gemini: 'gemini-2.5-flash',
  anthropic: 'claude-sonnet-5',
};

export type AiRequest = {
  url: string;
  headers: Record<string, string>;
  body: unknown;
};

export const buildAiRequest = (provider: AiProvider, apiKey: string, prompt: string): AiRequest => {
  if (provider === 'anthropic') {
    return {
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'content-type': 'application/json',
        // In a header, never the URL — a key in a URL ends up in logs and proxies.
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: MODEL.anthropic,
        max_tokens: 1024,
        // Low, not zero: this is drafting prose, but a lease clause is not the
        // place for invention.
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      },
    };
  }

  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${MODEL.gemini}:generateContent?key=${encodeURIComponent(apiKey)}`,
    headers: { 'content-type': 'application/json' },
    body: {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json' },
    },
  };
};

/**
 * Pull the text out, whatever came back.
 *
 * Returns '' rather than throwing on an unrecognised shape. A provider
 * changing its response format should degrade to "the model said nothing",
 * which the clause parse then reports cleanly — not a 500 in front of someone
 * drafting a lease.
 */
export const extractAiText = (provider: AiProvider, payload: unknown): string => {
  if (typeof payload !== 'object' || payload === null) {
    return '';
  }

  if (provider === 'anthropic') {
    const blocks = (payload as { content?: unknown }).content;

    if (!Array.isArray(blocks)) {
      return '';
    }

    return blocks
      .filter((block): block is { type: string; text: string } => {
        const candidate = block as { type?: unknown; text?: unknown };

        return candidate?.type === 'text' && typeof candidate.text === 'string';
      })
      .map((block) => block.text)
      .join('');
  }

  const candidates = (payload as { candidates?: unknown }).candidates;

  if (!Array.isArray(candidates)) {
    return '';
  }

  const parts = (candidates[0] as { content?: { parts?: unknown } })?.content?.parts;

  if (!Array.isArray(parts)) {
    return '';
  }

  return parts.map((part) => (part as { text?: unknown })?.text ?? '').join('');
};
