import { getInstanceAiConfig } from '../../server-only/instance-ai-config';
import type { ClauseDraft } from '../ai/clause-draft';
import { buildClauseDraftPrompt, parseClauseDraft } from '../ai/clause-draft';

/**
 * The HTTP shell around clause drafting. Everything that decides anything
 * lives in `ai/clause-draft.ts` and is pure.
 *
 * NO SDK. Called over `fetch` against the documented REST endpoint rather than
 * pulling in `@google-cloud/aiplatform`: a new dependency lands in upstream's
 * lockfile and has to be reconciled on every weekly sync, which is a recurring
 * cost for one POST.
 *
 * EXPRESS MODE. The instance config stores an API key, and Vertex accepts an
 * API key only in express mode — which uses the global endpoint and takes
 * neither a project nor a location. The `vertexProjectId` and `vertexLocation`
 * fields on the config are therefore unused on this path; they belong to the
 * OAuth service-account flow, which needs credentials this config does not
 * hold. Recorded here rather than left as a puzzle for whoever reads the admin
 * page and wonders why two fields do nothing.
 */

const ENDPOINT = 'https://aiplatform.googleapis.com/v1/publishers/google/models';
const MODEL = 'gemini-2.5-flash';

export type DraftClauseResult =
  | { ok: true; draft: ClauseDraft }
  | { ok: false; error: string; reason: 'not-configured' | 'call-failed' | 'rejected' };

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
  const config = await getInstanceAiConfig();

  /*
    Fails closed and says so. An unconfigured instance must not look like a
    model that had nothing to say — the landlord needs to know the difference
    between "AI is off" and "AI could not draft this".
  */
  if (!config?.enabled || !config.vertexApiKey) {
    return {
      ok: false,
      reason: 'not-configured',
      error: 'AI drafting is not switched on for this instance. An administrator can enable it under /admin/ai.',
    };
  }

  const prompt = buildClauseDraftPrompt({ request, sections, jurisdiction });

  let raw: string;

  try {
    const response = await fetch(
      `${ENDPOINT}/${MODEL}:generateContent?key=${encodeURIComponent(config.vertexApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            // Low, not zero: this is drafting prose, but a lease clause is not
            // the place for invention.
            temperature: 0.2,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!response.ok) {
      /*
        The body may echo the request, and the request contains the API key in
        its URL. Nothing from the response is surfaced or logged — only the
        status, which is enough to tell a bad key from an outage.
      */
      return {
        ok: false,
        reason: 'call-failed',
        error: `The drafting service returned ${response.status}. Nothing has been changed.`,
      };
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    raw = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  } catch {
    return {
      ok: false,
      reason: 'call-failed',
      error: 'The drafting service could not be reached. Nothing has been changed.',
    };
  }

  const parsed = parseClauseDraft(raw, { sections });

  if (!parsed.ok) {
    return { ok: false, reason: 'rejected', error: parsed.error };
  }

  return { ok: true, draft: parsed.draft };
};
