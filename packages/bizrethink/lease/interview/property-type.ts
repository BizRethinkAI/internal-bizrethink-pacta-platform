/**
 * How a property type reads inside a sentence.
 *
 * `maintenance.shift-single-family` opens "The Premises are a
 * {{propertyTypeLabel}}", and the label was `propertyType.replace('-', ' ')` —
 * so the correct path printed "The Premises are a single family." The value
 * was also a snapshot taken at matter creation and never recomputed, while the
 * type itself stays editable, so a lease corrected from condo to single-family
 * kept describing itself as a condo in the very clause whose statutory basis
 * depends on which it is.
 */

const LABELS: Record<string, string> = {
  'single-family': 'single-family home',
  duplex: 'duplex',
  condo: 'condominium unit',
  'multi-family': 'unit in a multi-family building',
};

/**
 * An unknown type falls back to its own slug made readable rather than to a
 * guess. Naming the wrong building type in a clause that cites §83.51(2) is
 * worse than naming an awkward one.
 */
export const propertyTypeLabelFor = (propertyType: string): string =>
  LABELS[propertyType] ?? propertyType.replace(/-/g, ' ').trim();
