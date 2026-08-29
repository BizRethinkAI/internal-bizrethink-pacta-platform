import type { CustomClauseInput } from '../clauses/custom';
import type { ClauseFacts } from '../clauses/types';
import type { InterpolationValue } from '../render/interpolate';
import type { NonWaivableRule } from '../rule-packs/us-fl-non-waivable';

/**
 * Checking clauses the landlord wrote themselves.
 *
 * THE ASYMMETRY THAT DECIDES EVERYTHING HERE. A false "this clause is fine" is
 * far worse than no check at all, because it manufactures confidence. So this
 * reports the statutory rule and the exact words it matched, and stops. It
 * never renders a verdict on a specific provision — that is the
 * unauthorized-practice line the rest of this project holds, and a regex is
 * not entitled to an opinion on it either way.
 *
 * WHAT IT DELIBERATELY DOES NOT ATTEMPT. Contradiction detection over
 * natural-language legal text is an open research problem, not a feature.
 * What is here is the part that can be done exactly: a fixed list of statutory
 * territory, and a handful of enumerable disagreements with answers already
 * given. Anything cleverer belongs to the AI layer, which may only raise a
 * question — never block, and never conclude.
 */

export type GuardrailSeverity = 'blocks' | 'warns';

export type GuardrailFinding = {
  ruleId: string;
  citation: string;
  clauseHeading: string;
  severity: GuardrailSeverity;
  /** The statutory rule, stated as a fact. */
  statute: string;
  /** What was found in the clause. Never a conclusion about it. */
  message: string;
  /** The exact substrings that matched, so a reader can judge for themselves. */
  matched: string[];
};

export type ScanOptions = {
  clauses: CustomClauseInput[];
  facts: ClauseFacts;
  values: Record<string, InterpolationValue>;
  pack: NonWaivableRule[];
};

/*
  A negation immediately before a match flips its meaning entirely.

  "Tenant does not waive any rights under Chapter 83" trips the same pattern as
  "Tenant waives any rights under Chapter 83" — the first protects the tenant,
  the second gives their rights away. Looking only at the words just BEFORE the
  match keeps this precise: "Landlord shall not be liable for any damages" is
  itself the waiver formula and contains its own "not", which sits inside the
  match rather than before it, so it still blocks.
*/
const NEGATION = /\b(does|do|shall|will|may|can|is|are)\s+not\s*$/i;

const isNegated = (body: string, index: number): boolean => NEGATION.test(body.slice(Math.max(0, index - 24), index));

type Match = { text: string; negated: boolean };

const collectMatches = (body: string, patterns: RegExp[] | undefined): Match[] => {
  if (!patterns) {
    return [];
  }

  const found: Match[] = [];

  for (const pattern of patterns) {
    const match = pattern.exec(body);

    if (match) {
      found.push({ text: match[0].trim(), negated: isNegated(body, match.index) });
    }
  }

  return found;
};

const scanNonWaivable = (clause: CustomClauseInput, pack: NonWaivableRule[]): GuardrailFinding[] => {
  const findings: GuardrailFinding[] = [];
  const body = clause.body;

  for (const rule of pack) {
    const waivers = collectMatches(body, rule.waiverSignals);
    const triggers = collectMatches(body, rule.triggers);

    if (waivers.length === 0 && triggers.length === 0) {
      continue;
    }

    // A negated waiver is a protection written down, not a waiver. It is still
    // reported — the subject matters — but it does not hold up the lease.
    const realWaivers = waivers.filter((match) => !match.negated);
    const isWaiver = realWaivers.length > 0;
    const shown = isWaiver ? realWaivers : waivers.length > 0 ? waivers : triggers;

    findings.push({
      ruleId: rule.id,
      citation: rule.citation,
      clauseHeading: clause.heading,
      severity: isWaiver ? 'blocks' : 'warns',
      statute: `${rule.citation} — ${rule.statute}`,
      message: isWaiver
        ? `This clause contains language that gives something up in an area ${rule.citation} reserves (${rule.area}).`
        : `This clause is about ${rule.area}, which ${rule.citation} governs.`,
      matched: shown.map((match) => match.text),
    });
  }

  return findings;
};

/*
  Contradictions with answers already given.

  Kept to cases that can be decided exactly. Pets is one: the interview asked,
  and a clause saying the opposite is a straight disagreement. A monthly-rent
  figure is another, but only where the clause calls the number the monthly
  rent — a late fee, a pet fee and a key charge are all legitimately different
  numbers, and flagging them would be noise.
*/
const PETS_FORBIDDEN = /\bno\s+pets\b|\bpets?\s+(are\s+)?(not\s+permitted|not\s+allowed|prohibited)\b/i;
const PETS_ALLOWED = /\b(may\s+keep|permitted\s+to\s+keep|may\s+have)\b[^.]{0,40}\b(pet|dog|cat|animal)/i;
const MONTHLY_RENT_FIGURE = /\bmonthly\s+rent\b[^.]{0,40}?\$\s*([\d,]+(?:\.\d{2})?)/i;

const asNumber = (value: InterpolationValue | undefined): number | null => (typeof value === 'number' ? value : null);

const scanContradictions = (
  clause: CustomClauseInput,
  facts: ClauseFacts,
  values: Record<string, InterpolationValue>,
): GuardrailFinding[] => {
  const findings: GuardrailFinding[] = [];
  const body = clause.body;
  const petsPermitted = (facts as unknown as Record<string, unknown>).petsPermitted;

  if (petsPermitted === true && PETS_FORBIDDEN.test(body)) {
    findings.push({
      ruleId: 'contradiction.pets',
      citation: 'Your answers',
      clauseHeading: clause.heading,
      severity: 'blocks',
      statute: 'The interview recorded that pets are permitted.',
      message: 'This clause states that pets are not permitted. The lease would say both.',
      matched: [PETS_FORBIDDEN.exec(body)?.[0].trim() ?? ''],
    });
  }

  if (petsPermitted === false && PETS_ALLOWED.test(body)) {
    findings.push({
      ruleId: 'contradiction.pets',
      citation: 'Your answers',
      clauseHeading: clause.heading,
      severity: 'blocks',
      statute: 'The interview recorded that pets are not permitted.',
      message: 'This clause permits a pet. The lease would say both.',
      matched: [PETS_ALLOWED.exec(body)?.[0].trim() ?? ''],
    });
  }

  const rentMatch = MONTHLY_RENT_FIGURE.exec(body);
  const answeredRent = asNumber(values.monthlyRentUsd);

  if (rentMatch && answeredRent !== null) {
    const stated = Number(rentMatch[1].replace(/,/g, ''));

    if (Number.isFinite(stated) && stated !== answeredRent) {
      findings.push({
        ruleId: 'contradiction.rent',
        citation: 'Your answers',
        clauseHeading: clause.heading,
        severity: 'blocks',
        statute: `The interview recorded a monthly rent of $${answeredRent.toLocaleString('en-US')}.`,
        message: `This clause states a monthly rent of $${stated.toLocaleString('en-US')}; the interview recorded $${answeredRent.toLocaleString('en-US')}. The lease would state two different rents — which is how the 2026 lease came to have a summary table disagreeing with page 22.`,
        matched: [rentMatch[0].trim()],
      });
    }
  }

  return findings;
};

export const scanCustomClauses = ({ clauses, facts, values, pack }: ScanOptions): GuardrailFinding[] =>
  clauses.flatMap((clause) => [...scanNonWaivable(clause, pack), ...scanContradictions(clause, facts, values)]);
