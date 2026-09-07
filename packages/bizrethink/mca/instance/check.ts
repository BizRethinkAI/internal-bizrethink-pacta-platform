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

const unmet = (identity: Identity, env: DisclosureEnvelope, prepaidTotal: Cents | null): IdentityRequirement[] =>
  identity.requires.filter((r) => {
    if (r === 'contract') {
      return !env.contract;
    }

    if (r === 'itemization') {
      return !env.itemization;
    }

    return prepaidTotal === null;
  });

export const checkDisclosureInstance = (env: DisclosureEnvelope): InstanceReport => {
  const prepaidTotal = prepaidTotalOf(env);
  const findings: InstanceFinding[] = [];
  const passed: string[] = [];
  const skipped: SkippedIdentity[] = [];
  const notApplicable: { identity: string; reason: string }[] = [];

  for (const identity of IDENTITIES) {
    const missing = unmet(identity, env, prepaidTotal);

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
  const undetected = new Set(report.skipped.flatMap((s) => s.wouldCatch));

  for (const identity of IDENTITIES) {
    if (!report.skipped.some((s) => s.identity === identity.id)) {
      for (const c of identity.catches) {
        undetected.delete(c);
      }
    }
  }

  return {
    evaluated: report.passed.length + new Set(report.findings.map((f) => f.identity)).size,
    total: IDENTITIES.length,
    skipped: report.skipped.length,
    notApplicable: report.notApplicable.length,
    /** REVIEW-01 findings that nothing in this run could have detected. */
    undetectableInThisEnvelope: [...undetected].sort(),
  };
};
