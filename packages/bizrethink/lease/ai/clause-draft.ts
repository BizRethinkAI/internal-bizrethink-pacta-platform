/**
 * Turning plain English into a clause the landlord can edit.
 *
 * This is the work that was done by hand for the six lettered clauses the 2026
 * Zillow lease buried in a free-text box under two headings reading "N/A" —
 * the most negotiated terms in a 26-page lease, sitting as unnumbered prose on
 * page 21.
 *
 * THE MODEL PROPOSES INTO AN EDITOR. It never inserts, never blocks and never
 * concludes. A false "this clause is fine" manufactures confidence and is
 * worse than no help at all, so:
 *
 *   - the output shape has nowhere to put a verdict. No `enforceable`, no
 *     `compliant`, no severity. Unknown keys are dropped rather than carried
 *     to the UI, so a model that invents one achieves nothing.
 *   - prose that smuggles a conclusion in is REJECTED, not shown.
 *   - the result is marked `ai-drafted` and travels as a customer-authored
 *     clause: outside the reviewed library, and printed under its own heading
 *     so a reader can tell generated text from attorney-reviewed text.
 *
 * The parse is where the safety lives, and it is pure. The HTTP call is a thin
 * shell around it.
 */

export type ClauseDraft = {
  heading: string;
  body: string;
  section: string;
  asserts: string[];
  /** Always 'ai-drafted'. Present so nothing downstream can forget. */
  origin: 'ai-drafted';
};

export type ParseResult = { ok: true; draft: ClauseDraft } | { ok: false; error: string };

export type ParseOptions = {
  /** Sections the engine knows. Anything else would place the clause nowhere. */
  sections: string[];
};

/*
  Phrases that turn drafted lease language into a statement ABOUT that
  language. A lease may name a statute — one that could not would be a poor
  lease — but it may not tell the reader what the law makes of it.

  Deliberately narrow. Over-rejecting sends the landlord back to a blank box,
  which is the state this feature exists to improve on.
*/
const LEGAL_CONCLUSION = [
  /\bis\s+(enforceable|unenforceable|valid|invalid|void|binding|legal|illegal)\b/i,
  /\b(complies|compliant|in\s+compliance)\s+with\b/i,
  /\bwill\s+(hold\s+up|stand\s+up)\s+in\s+court\b/i,
  /\bpermitted\s+under\s+(florida|the)\s+law\b/i,
];

const ADVICE = [/\byou\s+should\b/i, /\bwe\s+recommend\b/i, /\bwe\s+suggest\b/i, /\bit\s+is\s+advisable\b/i];

/**
 * Pull the JSON out of whatever the model returned.
 *
 * Models wrap JSON in prose and code fences even when told not to. Refusing
 * those would fail on output that is otherwise perfectly good, so the first
 * balanced object is extracted rather than demanding a bare document.
 */
const extractJson = (raw: string): unknown => {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');

  if (start === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
};

export const parseClauseDraft = (raw: string, { sections }: ParseOptions): ParseResult => {
  const parsed = extractJson(raw);

  if (parsed === null || typeof parsed !== 'object') {
    return { ok: false, error: 'The model did not return a clause. Try describing the term again.' };
  }

  const candidate = parsed as Record<string, unknown>;
  const heading = typeof candidate.heading === 'string' ? candidate.heading.trim() : '';
  const body = typeof candidate.body === 'string' ? candidate.body.trim() : '';
  const section = typeof candidate.section === 'string' ? candidate.section.trim() : '';

  if (heading === '' || body === '') {
    return { ok: false, error: 'The model returned an empty clause.' };
  }

  if (!sections.includes(section)) {
    return {
      ok: false,
      error: `The model chose a section the lease does not have (${section || 'none'}).`,
    };
  }

  const prose = `${heading} ${body}`;

  if (LEGAL_CONCLUSION.some((pattern) => pattern.test(prose))) {
    return {
      ok: false,
      error:
        'The draft stated a legal conclusion about itself rather than a term of the lease, so it was discarded. Try describing what you want to happen, rather than asking whether it is allowed.',
    };
  }

  if (ADVICE.some((pattern) => pattern.test(prose))) {
    return {
      ok: false,
      error: 'The draft gave advice rather than drafting a term, so it was discarded.',
    };
  }

  /*
    Rebuilt field by field rather than spread. A model that invents
    `enforceable: true` or `risk: 'low'` gets nothing through to the UI, and
    the shape is the last line of the no-verdicts rule.
  */
  return {
    ok: true,
    draft: {
      heading,
      body,
      section,
      asserts: Array.isArray(candidate.asserts)
        ? candidate.asserts.filter((tag): tag is string => typeof tag === 'string')
        : [],
      origin: 'ai-drafted',
    },
  };
};

export type PromptOptions = {
  /** What the landlord typed, in their own words. */
  request: string;
  sections: string[];
  jurisdiction: string;
};

export const buildClauseDraftPrompt = ({ request, sections, jurisdiction }: PromptOptions): string =>
  [
    `You are drafting one clause for a residential lease in jurisdiction ${jurisdiction}.`,
    '',
    'The landlord describes the term they want, in their own words:',
    '---',
    request,
    '---',
    '',
    'Write that as a single lease clause.',
    '',
    'Rules:',
    '- Draft the TERM. Do not comment on it, and do not state a legal conclusion about it:',
    '  never say a provision is enforceable, valid, void, legal, or that it complies with',
    '  any statute. Do not give advice — no "you should", no recommendations.', // legal-language-ok: this is the instruction FORBIDDING the phrase, quoted so the model recognises it
    '- You may cite a statute where a lease normally would. Citing is not concluding.',
    '- Refer to the parties as "Landlord" and "Tenant".',
    '- One clause. No heading numbers — numbering is derived later.',
    '- Keep it to what the landlord asked for. Do not invent obligations they did not describe.',
    '',
    `Choose the section it belongs in, from exactly this list: ${sections.join(', ')}.`,
    '',
    'Reply with JSON only, in this shape and with no other keys:',
    '{"heading": "...", "body": "...", "section": "...", "asserts": []}',
  ].join('\n');
