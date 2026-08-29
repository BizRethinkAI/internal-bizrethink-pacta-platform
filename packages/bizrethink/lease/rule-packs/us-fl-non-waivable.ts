/**
 * The parts of Florida landlord-tenant law a lease may not contract around.
 *
 * Data, like the numeric rule pack beside it, so another state is a sibling
 * file rather than an engine change. Every entry cites the statute it comes
 * from and states what that statute says — never what the reader should do
 * about it.
 *
 * TWO TIERS, and the distinction is the whole design. A keyword scan cannot
 * tell a waiver from a restatement of the same protection, so:
 *
 *   `waiverSignals` — formulas that only appear when something is being given
 *   up ("tenant waives", "shall not be liable"). Unambiguous enough to block.
 *
 *   `triggers` — subject matter the statute reserves. A clause here may be
 *   perfectly proper, or may even be protecting the tenant, so it only warns.
 *   Blocking a clause for restating a protection would teach people to ignore
 *   the whole mechanism.
 */

export type NonWaivableRule = {
  id: string;
  citation: string;
  /** What the statute governs, in plain words. */
  area: string;
  /** Statement of the statutory rule. A fact, never advice. */
  statute: string;
  /** Language that indicates something is being given up. Blocks. */
  waiverSignals?: RegExp[];
  /** Subject matter the statute reserves. Warns. */
  triggers?: RegExp[];
};

export const FL_NON_WAIVABLE: NonWaivableRule[] = [
  {
    id: 'non-waivable.part-ii-rights',
    citation: 'Fla. Stat. §83.47(1)(a)',
    area: 'Waiver of rights under Part II',
    statute:
      'A provision of a rental agreement is void to the extent that it purports to waive or preclude the rights, remedies, or requirements set forth in Part II of Chapter 83.',
    waiverSignals: [
      /\btenant\s+(hereby\s+)?waives\b/i,
      /\bwaives?\s+(any|all)\s+right/i,
      /\bwaiver\s+of\s+(any|all)\s+(right|remedy|remedies)/i,
      /\bnotwithstanding\s+(chapter\s+83|part\s+ii)/i,
      /\bshall\s+not\s+apply\s+to\s+this\s+lease\b/i,
    ],
  },
  {
    id: 'non-waivable.liability',
    citation: 'Fla. Stat. §83.47(1)(b)',
    area: 'Limiting liability arising under law',
    statute:
      'A provision is void to the extent that it purports to limit or preclude any liability of the landlord to the tenant, or of the tenant to the landlord, arising under law.',
    waiverSignals: [
      /\b(landlord|tenant)\s+shall\s+not\s+be\s+(liable|responsible)\s+for\s+any\b/i,
      /\b(disclaims?|excludes?)\s+(any|all)\s+liability\b/i,
      /\bhold\s+harmless\s+from\s+(any|all)\s+liability\s+arising\s+under\s+law\b/i,
    ],
  },
  {
    id: 'non-waivable.utility-interruption',
    citation: 'Fla. Stat. §83.67(1)',
    area: 'Interrupting utility service',
    statute:
      'A landlord may not cause, directly or indirectly, the termination or interruption of any utility service to the tenant — including water, heat, light, electricity, gas, elevator, garbage collection or refrigeration — whether or not the service is under the landlord’s control or paid for by the landlord. §83.67(6) sets the remedy at actual and consequential damages or three months’ rent, whichever is greater, plus costs and fees.',
    triggers: [
      /\b(shut\s*off|shut\s*ting\s*off|discontinue|interrupt|terminate|suspend|cut\s*off)\b[^.]{0,60}\b(water|electric|electricity|power|gas|utility|utilities|heat|garbage|refrigeration)\b/i,
      /\b(water|electric|electricity|power|gas|utility|utilities)\b[^.]{0,40}\b(may|will|shall)\s+be\s+(shut\s*off|discontinued|interrupted|terminated)\b/i,
    ],
  },
  {
    id: 'non-waivable.access-denial',
    citation: 'Fla. Stat. §83.67(2)',
    area: 'Preventing access to the dwelling',
    statute:
      'A landlord may not prevent the tenant from gaining reasonable access to the dwelling unit by any means, including changing the locks or using a bootlock or similar device.',
    triggers: [
      /\b(change|changing|re-?key|re-?keying|replace|replacing)\b[^.]{0,40}\block/i,
      /\b(bootlock|boot\s+lock|lock\s*out|lockout)\b/i,
      /\b(deny|denying|prevent|preventing|refuse|refusing)\b[^.]{0,40}\baccess\b/i,
    ],
  },
  {
    id: 'non-waivable.removal',
    citation: 'Fla. Stat. §83.67(3)',
    area: 'Removing doors, locks, roof, walls, windows or the tenant’s property',
    statute:
      'A landlord may not remove the outside doors, locks, roof, walls or windows of the unit except for maintenance, repair or replacement; nor remove the tenant’s personal property except after surrender, abandonment or the other circumstances the statute names.',
    triggers: [
      /\bremov(e|ing|al)\b[^.]{0,50}\b(outside\s+door|door|lock|roof|wall|window)/i,
      /\bremov(e|ing|al)\b[^.]{0,50}\b(tenant'?s?\s+)?(personal\s+)?(property|belongings|possessions)\b/i,
    ],
  },
  {
    id: 'non-waivable.building-codes',
    citation: 'Fla. Stat. §83.51(1)',
    area: 'The landlord’s building-code obligation',
    statute:
      'The landlord must comply at all times with applicable building, housing and health codes. Only the §83.51(2)(a) duties — screens, extermination, garbage, heat, running water and the like — may be shifted to the tenant in writing, and only for a single-family home or duplex. The §83.51(1) obligation is not among them.',
    waiverSignals: [
      /\btenant\s+(is|shall\s+be)\s+responsible\s+for\b[^.]{0,60}\b(building|housing|health)\s+code/i,
      /\btenant\s+(assumes|accepts)\b[^.]{0,40}\b(building|housing|health)\s+code/i,
    ],
  },
  {
    id: 'non-waivable.servicemember',
    citation: 'Fla. Stat. §83.682(5)',
    area: 'A servicemember’s early-termination right',
    statute:
      'The right of a servicemember to terminate a rental agreement on qualifying orders may not be waived, and a purported waiver is void.',
    waiverSignals: [/\bwaives?\b[^.]{0,60}\b(servicemember|military|deployment)\b/i],
  },
];
