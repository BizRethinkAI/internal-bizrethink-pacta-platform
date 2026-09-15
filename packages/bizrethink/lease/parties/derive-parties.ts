import type { LeaseParty, PartyRole } from '../render/signature-blocks';

/**
 * Who is signing, and the two names the lease opens by stating.
 *
 * The first clause of every Florida lease here reads "made on {{effectiveDate}}
 * between {{landlordNames}} and {{tenantNames}}", and both variables are
 * `required`. They also sit in DERIVED_VALUES — nobody types them — which left
 * them derived from nothing at all: the only place they were ever populated was
 * a hardcoded fixture. Any real lease therefore reported them as missing
 * forever, `readyToSend` stayed false, and the send path was unreachable.
 *
 * Party ORDER is load-bearing. `buildSignatureBlocks` numbers recipients
 * positionally (`r1`, `r2`, …) and upstream resolves those back by index, so
 * this module never sorts or regroups — landlords are not floated to the top,
 * and the list is passed through exactly as entered.
 */

export type LeasePartyInput = {
  name: string;
  role: PartyRole;
  /** Where the signing request goes. Never rendered into the PDF. */
  email: string;
};

/** Trimmed once, here, so every consumer keys off the same string. */
const clean = (name: string) => name.trim().replace(/\s+/g, ' ');

/**
 * "A", "A and B", "A, B, and C".
 *
 * Serial comma deliberately: in a document where each named person is
 * separately and jointly liable, "B and C" as the tail of a list should not be
 * readable as one compound party.
 */
const joinNames = (names: string[]): string => {
  if (names.length <= 1) {
    return names[0] ?? '';
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
};

const namesFor = (parties: LeasePartyInput[], role: PartyRole) =>
  parties.filter((party) => party.role === role).map((party) => clean(party.name));

/*
  "Name (address)" per person, for the §83.505 addendum.

  These were once two hand-typed interview questions, asked after the same
  addresses had already been entered against each signer. That was not merely
  double entry, it was WRONG: §83.505 requires a valid email address for EACH
  party, and one `tenantNoticeEmail` field cannot represent two tenants — the
  addendum named one of them and the second had elected nothing at all.

  The party list already holds one address per person, and already refuses two
  people sharing one. Deriving from it makes the addendum correct by
  construction and removes two questions.
*/
const noticeAddressesFor = (parties: LeasePartyInput[], role: PartyRole) =>
  parties.filter((party) => party.role === role).map((party) => `${clean(party.name)} (${party.email.trim()})`);

export type PartyValues = {
  landlordNames: string;
  tenantNames: string;
  landlordNoticeEmails: string;
  tenantNoticeEmails: string;
};

export const derivePartyValues = (parties: LeasePartyInput[]): PartyValues => ({
  landlordNames: joinNames(namesFor(parties, 'landlord')),
  tenantNames: joinNames(namesFor(parties, 'tenant')),
  landlordNoticeEmails: joinNames(noticeAddressesFor(parties, 'landlord')),
  tenantNoticeEmails: joinNames(noticeAddressesFor(parties, 'tenant')),
});

/** The render layer's view: names and roles, no contact details. */
export const toLeaseParties = (parties: LeasePartyInput[]): LeaseParty[] =>
  parties.map((party) => ({ name: clean(party.name), role: party.role }));

/**
 * Keyed by name, because that is what `buildEnvelopeInput` looks up. The
 * trimming here and in `toLeaseParties` must stay identical or every lookup
 * misses and the envelope is rejected for missing emails.
 */
export const partyEmails = (parties: LeasePartyInput[]): Record<string, string> =>
  Object.fromEntries(parties.map((party) => [clean(party.name), party.email.trim()]));

// Deliberately permissive. This rejects what is obviously not an address; it
// does not attempt to decide deliverability, which only sending can establish.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Everything wrong with the list, all at once.
 *
 * Returns findings rather than throwing on the first problem: a four-party
 * list that surfaces one error per submission is four round trips.
 */
export const validateParties = (parties: LeasePartyInput[]): string[] => {
  const findings: string[] = [];

  if (parties.length === 0) {
    return ['Add at least one landlord and one tenant.'];
  }

  if (!parties.some((party) => party.role === 'landlord')) {
    findings.push('At least one landlord must sign.');
  }

  if (!parties.some((party) => party.role === 'tenant')) {
    findings.push('At least one tenant must sign.');
  }

  for (const party of parties) {
    if (clean(party.name) === '') {
      findings.push('Every signer needs a name — it is printed above their signature line.');
    }

    if (!LOOKS_LIKE_EMAIL.test(party.email.trim())) {
      findings.push(`"${party.email.trim() || '(blank)'}" is not a valid email address.`);
    }
  }

  /*
    Both of these are silent when they break, which is why they are hard errors
    rather than warnings.

    Duplicate NAMES: emails are carried as Record<name, email>, so two parties
    with one name collapse to a single entry and one of them receives the
    other's signing link.

    Duplicate EMAILS: upstream sends a separate tokenised link per recipient. To
    one inbox, that is two links for two different people, and whoever opens
    them signs both blocks.

    Case- and whitespace-insensitive, because "Chris Keane" and "chris keane"
    are one person to everyone except a string comparison.
  */
  const seenNames = new Set<string>();
  const seenEmails = new Set<string>();

  for (const party of parties) {
    const name = clean(party.name).toLowerCase();
    const email = party.email.trim().toLowerCase();

    if (name !== '' && seenNames.has(name)) {
      findings.push(`Two signers are both named "${clean(party.name)}". Each signer needs a distinct name.`);
    }

    if (email !== '' && seenEmails.has(email)) {
      findings.push(`Two signers share the email ${party.email.trim()}. Each signer needs their own address.`);
    }

    seenNames.add(name);
    seenEmails.add(email);
  }

  return findings;
};
