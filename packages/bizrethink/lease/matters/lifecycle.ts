/**
 * What may be thrown away, and what may not.
 *
 * A draft nobody has seen is a scratch pad. Trying the interview out for ten
 * minutes leaves several, and being unable to remove them makes the list
 * useless.
 *
 * A lease that has been SENT is not a scratch pad. Recipients hold links to
 * it, an envelope exists, and the audit trail of a document out for signature
 * is not the landlord's to erase by clicking a bin.
 *
 * The rule lives here rather than in a route handler because it is a fact
 * about the domain — and because a rule that lives in one button is a rule the
 * next button forgets.
 */

export type DeletableMatter = {
  status: string;
  envelopeId: string | null;
};

export type DeleteVerdict = { ok: true } | { ok: false; reason: string };

export const canDeleteMatter = ({ status, envelopeId }: DeletableMatter): DeleteVerdict => {
  /*
    The envelope is checked first and independently of status. The two are
    written together, but if they ever disagreed the envelope is the fact that
    matters: a document exists and people may hold links to it.
  */
  if (envelopeId !== null) {
    return {
      ok: false,
      reason: 'This lease has already been sent for signature. Cancel it from the documents list instead.',
    };
  }

  // Allowlist, not a denylist: a status invented later is refused by default
  // rather than becoming quietly deletable.
  if (status !== 'draft') {
    return {
      ok: false,
      reason: `This lease is no longer a draft (${status}), so it is not something to delete.`,
    };
  }

  return { ok: true };
};
