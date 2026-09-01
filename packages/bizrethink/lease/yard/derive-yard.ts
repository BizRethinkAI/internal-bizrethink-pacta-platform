/**
 * Who does what in the yard.
 *
 * This was one boolean — `landlordProvidesLawnService` — with the entire
 * allocation hard-coded into the clause body: landlord mows and trims, tenant
 * waters and keeps the beds. A landlord whose split runs the other way, taking
 * fertiliser and giving the tenant the mowing, watering and shrubs, had no way
 * to say so. Switching the boolean off was worse than useless: no clause
 * rendered at all, and the yard went into the lease UNALLOCATED.
 *
 * Rows now, each with exactly one `doneBy`, and all three duty lists derived
 * from that one array — so a task cannot land on two sides, and cannot land on
 * none without `unassignedYardTasks` naming it.
 *
 * Per LEASE, not per property, which is where this parts company with
 * utilities. The electric co-op at an address is the same for every tenancy;
 * who cuts the grass is negotiated with the person signing. It lives in
 * `BizrethinkLeaseMatter.values.yardTasks`, whose shape is owned here rather
 * than by Prisma.
 *
 * `association` is a real third answer, not padding. Florida master
 * associations often mow the common areas and sometimes the parcels, and those
 * tasks belong to neither party — with only two values they would silently
 * default to the landlord.
 */

export type YardDoer = 'tenant' | 'landlord' | 'association';

export type YardTask = {
  /** "Mowing and edging", "Palm and tree trimming". */
  task: string;
  /**
   * Empty until the landlord decides. Never defaulted: guessing an allocation
   * is the whole defect this replaced, and a wrong guess reads as agreed.
   */
  doneBy: YardDoer | '';
  /** Optional. "Weekly", "Twice yearly". */
  frequency: string;
  /** Optional. "dead fronds and seed heads". */
  notes: string;
};

const clean = (value: string) => value.trim().replace(/\s+/g, ' ');

/*
  Row values are stored capitalised, because that is how they read in the
  editor, but they are interpolated mid-sentence after a colon. Downshifting
  the first letter unconditionally would mangle "Bahia Sod" and "HVAC filters",
  so it happens only where the rest of the string carries no capital of its own
  — which is exactly the sentence-cased case and none of the proper nouns.
*/
const inSentence = (value: string): string => {
  const text = clean(value);

  if (text === '' || /[A-Z]/.test(text.slice(1))) {
    return text;
  }

  return text.charAt(0).toLowerCase() + text.slice(1);
};

/** "palm and tree trimming (dead fronds and seed heads), twice yearly" */
const describe = (row: YardTask): string => {
  const notes = clean(row.notes);
  const frequency = inSentence(row.frequency);

  const head = notes === '' ? inSentence(row.task) : `${inSentence(row.task)} (${notes})`;

  return frequency === '' ? head : `${head}, ${frequency}`;
};

// Serial comma, matching the utility list and the party names.
const join = (parts: string[]): string => {
  if (parts.length === 0) {
    /*
      Empty, NOT the word "none" that renderUtilityList returns. A utility list
      is interpolated mid-sentence, so "none" completes the sentence. A yard
      side with nothing on it has no sentence at all — see renderYardDuties.
    */
    return '';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
};

const named = (rows: YardTask[]): YardTask[] => rows.filter((row) => clean(row.task) !== '');

export const renderYardList = (rows: YardTask[]): string => join(named(rows).map(describe));

/** The three lists, from one source, so they cannot disagree. */
export const splitByDoer = (rows: YardTask[]): { tenant: string; landlord: string; association: string } => ({
  tenant: renderYardList(rows.filter((row) => row.doneBy === 'tenant')),
  landlord: renderYardList(rows.filter((row) => row.doneBy === 'landlord')),
  association: renderYardList(rows.filter((row) => row.doneBy === 'association')),
});

/**
 * The whole allocation as prose, for a single clause variable.
 *
 * One variable rather than three because the sentences have to disappear
 * together with their lists. Three variables would put the empty-string
 * handling in the clause body, where "Landlord shall, at Landlord's cost,
 * attend to the following: ." is one missing guard away.
 */
export const renderYardDuties = (rows: YardTask[]): string => {
  const split = splitByDoer(rows);

  const sentences = [
    split.tenant === '' ? '' : `Tenant shall, at Tenant's cost, attend to the following: ${split.tenant}.`,
    split.landlord === '' ? '' : `Landlord shall, at Landlord's cost, attend to the following: ${split.landlord}.`,
    split.association === '' ? '' : `The following are provided by the association: ${split.association}.`,
  ];

  return sentences.filter((sentence) => sentence !== '').join(' ');
};

/**
 * Rows nobody has been given.
 *
 * Returned as typed rather than downshifted: this is shown to the landlord in
 * the review panel, not printed into the lease. A blank row is an unfinished
 * form, not an unallocated duty, so it is not reported.
 */
export const unassignedYardTasks = (rows: YardTask[]): string[] =>
  named(rows)
    .filter((row) => row.doneBy === '')
    .map((row) => clean(row.task));

/**
 * The starting list.
 *
 * Not filtered by property facts. Whether a given address has palms or beds is
 * not something the property record knows, and seeding a shorter list from a
 * guess loses the row the landlord most needed to see. Deleting a row that
 * does not apply is cheap; noticing an absent one is not.
 *
 * The pool is deliberately absent — `maintenance.pool-split` already allocates
 * it, and a pool row here would allocate it a second time, in a second clause,
 * with nothing keeping the two answers the same.
 */
export const DEFAULT_YARD_TASKS: { task: string; frequency: string; example: string }[] = [
  /*
    Each job carries its own frequency and its own example.

    Both used to be one hard-coded placeholder shared by every row — "Twice
    yearly" and "dead fronds and seed heads", which belong to the palms — so a
    mowing row ghost-suggested it covered dead fronds, twice a year. And a
    single blank frequency meant typing the same answer six times.

    Florida mowing genuinely splits by season, which is why the mowing entry
    says so rather than "as needed": "as needed" is what the association and
    the tenant disagreed about in the first place.
  */
  {
    task: 'Mowing and edging',
    frequency: 'Weekly March to October, fortnightly otherwise',
    example: 'lawn, verges and edging along paths and beds',
  },
  {
    task: 'Irrigation and watering',
    frequency: 'As the season requires',
    example: 'running the system; reporting a failed head or a leak',
  },
  { task: 'Shrubs, hedges and beds', frequency: 'Quarterly', example: 'trimming, weeding and mulch' },
  { task: 'Palm and tree trimming', frequency: 'Twice yearly', example: 'dead fronds and seed heads' },
  {
    task: 'Fertilisation and lawn pest treatment',
    frequency: 'Quarterly',
    example: 'lawn feed, chinch bug and grub treatment',
  },
  { task: 'Leaf and debris clearance', frequency: 'Monthly', example: 'leaves, fallen limbs and storm debris' },
];

/** The example for a job, for the "what it covers" placeholder. */
export const exampleFor = (task: string): string =>
  DEFAULT_YARD_TASKS.find((entry) => entry.task.toLowerCase() === clean(task).toLowerCase())?.example ??
  'what this job includes';

export const seedYardTasks = (): YardTask[] =>
  DEFAULT_YARD_TASKS.map(({ task, frequency }) => ({ task, doneBy: '', frequency, notes: '' }));
