import type { McaEntityInput } from './entity';

/**
 * The line under an entity's name in the list.
 *
 * Modelled on the lease builder's property card, which reads "single family ·
 * Wesley Chapel, FL · Pasco County · pool · HOA": the facts that decide what a
 * document written against it will say, so a person can tell two records apart
 * without opening either.
 *
 * For an entity those are what it **is** and what its programme **does**. Two
 * entities can share a legal name — which is the whole reason `label` exists as
 * a separate field — and two entities can share a label while running
 * programmes that produce different paper.
 *
 * Derived rather than stored, and derived from the same policy the compiler
 * reads, so it cannot describe a programme the documents do not run.
 */
export const entitySummaryLine = (entity: Pick<McaEntityInput, 'identity' | 'policy'>): string => {
  const states = entity.policy.recipientStates.length;

  return [
    entity.identity.entityType,
    entity.identity.organizationState,
    /*
      Hyphens are how the value is stored, not how it is read: `daily-ach` is a
      key and "daily ach" is a fact about the programme.
    */
    entity.policy.collectionMethod.replace(/-/g, ' '),
    /*
      A COUNT, NOT A LIST. Eleven state codes would be the whole line, and the
      number is what distinguishes two entities at a glance. Nowhere yet is a
      real state — it is what a half-finished entity looks like — and "0 states"
      reads as a defect rather than as a fact about the programme.
    */
    states === 0 ? 'no states yet' : `${states} ${states === 1 ? 'state' : 'states'}`,
  ]
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .join(' · ');
};
