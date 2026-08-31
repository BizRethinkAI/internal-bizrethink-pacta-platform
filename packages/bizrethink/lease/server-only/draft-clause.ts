import { getResolvedAiConfig } from '../../server-only/instance-ai-config';
import type { ClauseDraft } from '../ai/clause-draft';
import { buildClauseDraftPrompt, parseClauseDraft } from '../ai/clause-draft';
import type { AiProvider } from '../ai/providers';
import { buildAiRequest, describeAiError, extractAiText } from '../ai/providers';

/**
 * The HTTP shell around clause drafting. Everything that decides anything
 * lives in `ai/clause-draft.ts` and `ai/providers.ts`, and is pure.
 *
 * NO SDK. Called over `fetch` rather than pulling in a provider library: a new
 * dependency lands in upstream's lockfile and has to be reconciled on every
 * weekly sync, which is a recurring cost for one POST.
 */

export type AiCallFailure = { ok: false; error: string; reason: 'not-configured' | 'call-failed' | 'rejected' };

const NOT_CONFIGURED: AiCallFailure = {
  ok: false,
  reason: 'not-configured',
  error: 'AI drafting is not switched on for this instance. An administrator can enable it under /admin/ai.',
};

/**
 * One model call. Returns the raw text, or a failure that is safe to show.
 *
 * THE PROVIDER'S OWN REASON IS SURFACED, narrowly. Reporting only the status
 * made every failure look the same — a wrong model name, a revoked key, a key
 * from the wrong product and an exhausted quota all read "returned 404", which
 * is exactly the situation an Anthropic key landed in while a Gemini key
 * worked.
 *
 * Narrowly, because Gemini takes its key in the URL: only the `error.message`
 * field is read, never the raw body, and the key is redacted from it
 * afterwards in case the provider quoted the request back.
 */
export const callAi = async (
  provider: AiProvider,
  apiKey: string,
  prompt: string,
): Promise<{ ok: true; text: string } | AiCallFailure> => {
  const request = buildAiRequest(provider, apiKey, prompt);

  try {
    const response = await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      // Parsed defensively: a gateway may return HTML, which must not throw
      // here and turn a bad key into an unhandled error.
      const body = await response.json().catch(() => null);

      return {
        ok: false,
        reason: 'call-failed',
        error: `${provider} — ${describeAiError(response.status, body, apiKey)}`,
      };
    }

    return { ok: true, text: extractAiText(provider, await response.json()) };
  } catch {
    return {
      ok: false,
      reason: 'call-failed',
      error: `The ${provider} API could not be reached. Nothing has been changed.`,
    };
  }
};

export type DraftClauseResult = { ok: true; draft: ClauseDraft } | AiCallFailure;

export type DraftClauseOptions = {
  request: string;
  sections: string[];
  jurisdiction?: string;
};

export const draftClause = async ({
  request,
  sections,
  jurisdiction = 'US-FL',
}: DraftClauseOptions): Promise<DraftClauseResult> => {
  const config = await getResolvedAiConfig();

  /*
    Fails closed and says so. An unconfigured instance must not look like a
    model that had nothing to say — the landlord needs to know the difference
    between "AI is off" and "AI could not draft this".
  */
  if (!config) {
    return NOT_CONFIGURED;
  }

  const called = await callAi(
    config.provider,
    config.apiKey,
    buildClauseDraftPrompt({ request, sections, jurisdiction }),
  );

  if (!called.ok) {
    return called;
  }

  const parsed = parseClauseDraft(called.text, { sections });

  if (!parsed.ok) {
    return { ok: false, reason: 'rejected', error: parsed.error };
  }

  return { ok: true, draft: parsed.draft };
};

/**
 * Does the configured key actually work?
 *
 * Every other instance-config page has this, and without it the first real
 * test of a key was trying to draft a clause and reading a failure that could
 * equally have been a bad prompt. Asks for one word, so a success costs
 * almost nothing.
 */
export const testAiConnection = async (): Promise<{ ok: true; provider: AiProvider } | AiCallFailure> => {
  const config = await getResolvedAiConfig();

  if (!config) {
    return NOT_CONFIGURED;
  }

  const called = await callAi(config.provider, config.apiKey, 'Reply with the single word: ready');

  if (!called.ok) {
    return called;
  }

  if (called.text.trim() === '') {
    return {
      ok: false,
      reason: 'call-failed',
      error: 'The key was accepted but the model returned nothing. The response format may have changed.',
    };
  }

  return { ok: true, provider: config.provider };
};
