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

/*
  What actually went wrong.

  The first version reported only the HTTP status, which is every failure at
  once — a wrong model name, a revoked key, a key from the wrong product, an
  exhausted quota. A Gemini key worked and an Anthropic key did not, and
  "returned 404" could not tell them apart. The provider had said exactly
  which, and we discarded it.

  It was discarded for a reason: Gemini takes its key IN THE URL, so echoing a
  raw error body risks echoing the credential. So this extracts only the one
  field both providers put the reason in, and then redacts anything that still
  looks like the key — because a rule that depends on a provider never quoting
  the request is a rule that holds right up until it does not.
*/

const MAX_MESSAGE = 300;

/**
 * Shortest string treated as a credential when redacting.
 *
 * Below this it is a substring of ordinary English rather than a key, and
 * redacting it corrupts the message instead of protecting anything — with the
 * literal "k", "The API key was not accepted" became "The API [redacted]ey was
 * not accepted".
 *
 * Set above the longest word likely to appear in an error message, and far
 * below any real credential: Anthropic keys are ~100 characters and Google's
 * ~39, so nothing that needs hiding comes close to this floor.
 */
const MIN_REDACTABLE_KEY = 16;

/** What a bare status means, when the body is unreadable. */
const BY_STATUS: Record<number, string> = {
  400: 'The request was rejected — often a model name the account cannot use.',
  401: 'The API key was not accepted.',
  403: 'The API key was accepted but is not permitted to use this model.',
  404: 'The model was not found for this account.',
  429: 'Rate limited, or the account is out of quota.',
};

const readMessage = (body: unknown): string | null => {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const error = (body as { error?: unknown }).error;

  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const message = (error as { message?: unknown }).message;

  return typeof message === 'string' && message.trim() !== '' ? message.trim() : null;
};

export const describeAiError = (status: number, body: unknown, apiKey: string): string => {
  const detail = readMessage(body) ?? BY_STATUS[status] ?? 'No further detail was given.';

  /*
    Redacted AFTER extraction rather than trusted to be absent.

    Only for a string long enough to be a credential. A short one is a
    substring of ordinary words — redacting the literal "k" turned "The API key
    was not accepted" into "The API [redacted]ey was not accepted", mangling
    every message it touched. Real keys are far longer than this floor, so
    nothing that needs hiding escapes it.
  */
  const safe = apiKey.length >= MIN_REDACTABLE_KEY ? detail.split(apiKey).join('[redacted]') : detail;

  return `${status}: ${safe.slice(0, MAX_MESSAGE)}`;
};
