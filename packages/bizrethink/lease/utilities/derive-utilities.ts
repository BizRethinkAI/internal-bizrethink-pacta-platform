/**
 * Who arranges which utility, and who to ring about it.
 *
 * This was two free-text boxes, and a real answer went in as a hand-typed
 * numbered list with company names and phone numbers. All of it is PROPERTY
 * data — the electric co-op and the trash contractor at a given address are
 * the same for every tenancy — so it was retyped every lease, and the
 * tenant-paid and landlord-paid lists could drift apart with nothing able to
 * notice.
 *
 * Structured on the property, rendered into prose here. Both sides come from
 * ONE list split by payer, so a utility cannot end up on both or neither.
 */

export type UtilityPayer = 'tenant' | 'landlord';

export type UtilityRow = {
  /** "electricity", "water and sewer", "trash collection". */
  service: string;
  /** Optional: some utilities are billed through the landlord with no supplier to name. */
  provider: string;
  /** Optional. Printed so a tenant has someone to ring on day one. */
  phone: string;
  paidBy: UtilityPayer;
};

const clean = (value: string) => value.trim().replace(/\s+/g, ' ');

/**
 * "electricity (Withlacoochee River Electric Cooperative, 352-588-5115)"
 *
 * Degrades in the order the information usually goes missing: provider and
 * phone, then phone alone, then just the service.
 */
const describe = (row: UtilityRow): string => {
  const service = clean(row.service);
  const provider = clean(row.provider);
  const phone = clean(row.phone);

  if (provider === '') {
    return service;
  }

  return phone === '' ? `${service} (${provider})` : `${service} (${provider}, ${phone})`;
};

/*
  Serial comma, matching the party name list. In a document where each item is
  a separately arranged service, "water and sewer and gas" as a tail should not
  be readable as one supplier.
*/
const join = (parts: string[]): string => {
  if (parts.length === 0) {
    // The clause interpolates this mid-sentence — "Landlord shall provide and
    // pay for: ." is the alternative.
    return 'none';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
};

export const renderUtilityList = (rows: UtilityRow[]): string =>
  join(rows.filter((row) => clean(row.service) !== '').map(describe));

/** The two clause variables, from one source, so they cannot disagree. */
export const splitByPayer = (rows: UtilityRow[]): { tenant: string; landlord: string } => ({
  tenant: renderUtilityList(rows.filter((row) => row.paidBy === 'tenant')),
  landlord: renderUtilityList(rows.filter((row) => row.paidBy === 'landlord')),
});
