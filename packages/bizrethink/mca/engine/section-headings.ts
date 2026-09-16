type SectionItem = { section: string; number: string | null; instrument?: string };

/**
 * What each section is called, per instrument.
 *
 * Title-casing the identifier is not a name. `service` read "Service" for a
 * section about waiving personal service of process, and `default` read
 * "Default" for events of default and remedies. The names below are the ones
 * the instruments themselves use.
 *
 * Keyed by instrument because the same identifier means different things:
 * `guaranty` is the FRPA's personal guaranty of performance and the equipment
 * lease's personal guaranty, and `agreement` is a lease in one document and a
 * subscription in another. `section-headings.test.ts` fails when a section any
 * instrument uses has no name here, so a new section cannot quietly fall back
 * to its slug.
 */
const SECTION_NAMES: Record<string, Record<string, string>> = {
  frpa: {
    preamble: 'Preamble',
    'funding-terms': 'Merchant and Funding Information',
    purchase: 'Purchase and Sale of Future Receivables',
    reconciliation: 'Reconciliation and Adjustment',
    enrollment: 'Terms of Enrollment',
    representations: 'Representations, Warranties, and Covenants',
    default: 'Events of Default and Remedies',
    miscellaneous: 'Miscellaneous',
    renewal: 'Renewal and Rollover',
    guaranty: 'Personal Guaranty of Performance',
    service: 'Waiver of Personal Service',
    appendix: 'Fee Schedule',
    execution: 'Execution',
    'split-funding-exhibit': 'Split Funding Authorization exhibit',
    'permission-to-release-exhibit': 'Permission to Release exhibit',
  },
  'equipment-lease': {
    agreement: 'Equipment Lease Terms and Conditions',
    guaranty: 'Personal Guaranty',
    preamble: 'Lessee and Equipment Information',
    execution: 'Execution',
  },
  subscription: {
    agreement: 'Subscription Terms and Conditions',
    guaranty: 'Personal Guaranty',
    preamble: 'Subscriber and Equipment Information',
    execution: 'Execution',
  },
  'iso-pra': {
    general: 'General Terms',
    'referral-duties': 'Referral Duties',
    commission: 'Commission',
    'additional-obligations': 'Additional Obligations',
    execution: 'Execution',
  },
  'permission-to-release': {
    authorisations: 'Authorizations',
    execution: 'Execution',
  },
  'split-funding': {
    letter: 'Split Funding Authorization',
  },
};

/** Is this section named here, rather than falling back to its slug? */
export const hasMcaSectionName = (section: string, instrument: string): boolean =>
  Boolean(SECTION_NAMES[instrument]?.[section]);

export const mcaSectionName = (section: string, instrument?: string): string => {
  const named = instrument ? SECTION_NAMES[instrument]?.[section] : undefined;

  return (
    named ??
    section
      .split('-')
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(' ')
  );
};

/** Presentation only: use the existing citation, never assign a new number.
 * Reusable-only sections have no citation. A review combining different
 * selections must not claim a common parent number when those numbers differ. */
export const mcaSectionHeading = (
  section: string,
  items: Pick<SectionItem, 'number'>[],
  instrument?: string,
): string => {
  const numbers = [...new Set(items.flatMap((item) => (item.number ? [item.number.split('.')[0]] : [])))];
  const name = mcaSectionName(section, instrument);
  return numbers.length === 1 ? `Section ${numbers[0]}: ${name}` : name;
};

/** Preserve exact document/field order, even when a section resumes later.
 * A leading field group gets its heading from the numbered clauses that follow. */
export const groupMcaSections = <T extends SectionItem>(items: T[], instrument?: string) => {
  const groups: { section: string; heading: string; items: T[] }[] = [];
  for (const item of items) {
    const previous = groups.at(-1);
    if (previous?.section === item.section) {
      previous.items.push(item);
    } else {
      groups.push({
        section: item.section,
        heading: mcaSectionHeading(
          item.section,
          items.filter((entry) => entry.section === item.section),
          item.instrument ?? instrument,
        ),
        items: [item],
      });
    }
  }
  return groups;
};
