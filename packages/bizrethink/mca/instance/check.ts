import { IDENTITIES, type Identity, type IdentityRequirement } from './identities';
import type { Cents, DisclosureEnvelope, InstanceFinding } from './types';

/**
 * Run every identity that this envelope carries enough documents to decide, and
 * say plainly which ones it does not.
 *
 * THE SKIPPED LIST IS NOT BOOKKEEPING. Two of the three REVIEW-01 blockers are
 * undetectable from the offer summary alone — they move the same sum in
 * opposite directions, so every within-form identity cancels — and become
 * detectable the moment the agreement or the Itemization is in the envelope.
 * An empty findings list from a one-document envelope therefore means very
 * little, and a caller that cannot see WHICH checks did not run will read it as
 * a clean form. That is the exact failure this package exists to end, so it is
 * reported in the same object as the findings rather than left to be inferred.
 */

export type SkippedIdentity = {
  identity: string;
  statement: string;
  reason: string;
  /** REVIEW-01 finding ids that go undetected while this identity is skipped. */
  wouldCatch: string[];
};

export type InstanceReport = {
  findings: InstanceFinding[];
  /** Identities that ran against real figures and found nothing. */
  passed: string[];
  /** Identities the envelope does not carry the documents to decide. */
  skipped: SkippedIdentity[];
  /**
   * Identities with nothing to decide on this instance, because the figure they
   * compare is blank. Kept apart from `passed` deliberately: an identity whose
   * input is empty returns no findings exactly as a satisfied one does, and
   * counting the two together is how a run goes green while checking nothing.
   */
  notApplicable: { identity: string; reason: string }[];
};

const REQUIREMENT_REASON: Record<IdentityRequirement, string> = {
  contract:
    'the agreement travelling in the same envelope is not in the instance, so its purchase price, purchased amount and fee schedule are unavailable',
  itemization: 'the Itemization of Amount Financed is not in the instance',
  'prepaid-total':
    'neither the agreement’s fee schedule nor the Itemization’s prepaid finance charge line is in the instance, so the total withheld at funding is unknown',
};

const prepaidTotalOf = (env: DisclosureEnvelope): Cents | null => {
  if (env.contract) {
    return env.contract.feesWithheldAtFunding.reduce((s, f) => s + f.amount, 0);
  }

  return env.itemization ? env.itemization.prepaidFinanceCharge : null;
};

/**
 * Which documents travelled in the envelope, and nothing else about them.
 *
 * Every entry in `skipped` turns on this and on no figure — an identity is
 * skipped because a document is absent, never because a number is wrong. That
 * makes the skip set answerable for an envelope SHAPE, before any instance
 * exists, which is what the conformity surface needs: the page has no filled
 * envelope to report on and would otherwise have to invent one.
 */
export type EnvelopeContents = {
  contract: boolean;
  itemization: boolean;
};

const contentsOf = (env: DisclosureEnvelope): EnvelopeContents => ({
  contract: env.contract !== undefined,
  itemization: env.itemization !== undefined,
});

const unmet = (identity: Identity, contents: EnvelopeContents): IdentityRequirement[] =>
  identity.requires.filter((r) => {
    if (r === 'contract') {
      return !contents.contract;
    }

    if (r === 'itemization') {
      return !contents.itemization;
    }

    // The prepaid total comes from the agreement's fee schedule OR the
    // Itemization's prepaid line, so either document satisfies it.
    return !contents.contract && !contents.itemization;
  });

const skippedFor = (contents: EnvelopeContents): SkippedIdentity[] =>
  IDENTITIES.flatMap((identity) => {
    const missing = unmet(identity, contents);

    return missing.length === 0
      ? []
      : [
          {
            identity: identity.id,
            statement: identity.statement,
            reason: missing.map((m) => REQUIREMENT_REASON[m]).join('; '),
            wouldCatch: identity.catches,
          },
        ];
  });

/**
 * The REVIEW-01 findings that nothing in a run could have detected.
 *
 * A finding is undetected only if EVERY identity that catches it was skipped —
 * one identity that ran is enough. Shared between the per-instance and the
 * per-shape report so the two cannot drift into disagreeing about the same
 * envelope.
 */
const undetectableGiven = (skipped: readonly { identity: string; wouldCatch: string[] }[]): string[] => {
  const undetected = new Set(skipped.flatMap((s) => s.wouldCatch));

  for (const identity of IDENTITIES) {
    if (!skipped.some((s) => s.identity === identity.id)) {
      for (const c of identity.catches) {
        undetected.delete(c);
      }
    }
  }

  return [...undetected].sort();
};

export const checkDisclosureInstance = (env: DisclosureEnvelope): InstanceReport => {
  const prepaidTotal = prepaidTotalOf(env);
  const findings: InstanceFinding[] = [];
  const passed: string[] = [];
  const skipped: SkippedIdentity[] = [];
  const notApplicable: { identity: string; reason: string }[] = [];

  const contents = contentsOf(env);

  for (const identity of IDENTITIES) {
    const missing = unmet(identity, contents);

    if (missing.length > 0) {
      skipped.push({
        identity: identity.id,
        statement: identity.statement,
        reason: missing.map((m) => REQUIREMENT_REASON[m]).join('; '),
        wouldCatch: identity.catches,
      });
      continue;
    }

    const applicable = identity.applicable?.(env) ?? { ok: true as const };

    if (!applicable.ok) {
      notApplicable.push({ identity: identity.id, reason: applicable.reason });
      continue;
    }

    const raw = identity.evaluate(env, { prepaidTotal });

    if (raw.length === 0) {
      passed.push(identity.id);
      continue;
    }

    for (const f of raw) {
      findings.push({
        ...f,
        identity: identity.id,
        // The jurisdiction axis filters here and nowhere else: a finding on a
        // California instance can only ever carry California authority.
        authorities: identity.authorities[env.jurisdiction],
      });
    }
  }

  return { findings, passed, skipped, notApplicable };
};

/**
 * What the checker can see, stated as a number so a green run cannot be
 * mistaken for a clean form.
 *
 * The prescribed-form checker has `coverage()` for the same reason: on New
 * York's §600.6 five rows of eleven have no prescribed wording to compare, and
 * a suite that passes while checking half a form is a suite that reports the
 * half it checked. The instance side has the same shape of gap and a worse one,
 * because the missing half here is not "text we cannot compare" but "documents
 * that are not in the envelope".
 */
export const instanceCoverage = (env: DisclosureEnvelope) => {
  const report = checkDisclosureInstance(env);

  return {
    evaluated: report.passed.length + new Set(report.findings.map((f) => f.identity)).size,
    total: IDENTITIES.length,
    skipped: report.skipped.length,
    notApplicable: report.notApplicable.length,
    /** REVIEW-01 findings that nothing in this run could have detected. */
    undetectableInThisEnvelope: undetectableGiven(report.skipped),
  };
};

/**
 * The same question, asked of an envelope SHAPE rather than of an instance.
 *
 * `instanceCoverage` needs a filled disclosure. The read-only conformity
 * surface has none, and fabricating one so a page could show a number would be
 * the sort of reassurance this package exists to refuse. What CAN be stated
 * without any instance is which identities a given combination of documents
 * lets the checker decide at all — because that turns on document presence and
 * on nothing else.
 *
 * It is strictly the weaker claim, and the difference matters when reading the
 * page: `evaluable` counts identities the checker could reach, not identities
 * that would pass. An identity can be evaluable and still return nothing
 * because the figure it compares is blank — `notApplicable` in
 * `InstanceReport`, which needs the figures and is therefore absent here.
 */
export const coverageForContents = (contents: EnvelopeContents) => {
  const skipped = skippedFor(contents);

  return {
    evaluable: IDENTITIES.length - skipped.length,
    total: IDENTITIES.length,
    skipped,
    undetectableInThisEnvelope: undetectableGiven(skipped),
  };
};
