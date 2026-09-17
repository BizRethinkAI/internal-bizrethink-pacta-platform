import { prisma } from '@documenso/prisma';

import { contentFindingSlugs, contentFor } from '../../catalogue';
import { outstandingFindingsFor, REGISTER_AVAILABLE } from '../../clauses/examination';
import type { McaContent } from '../../clauses/types';
import { libraryFindingHoldTargets } from '../../review/holds';
import { loadMcaClauseApprovals } from '../../server-only/clause-approvals';
import type { McaTemplateSnapshot } from '../../templates/compile';
import type { McaPublishablePackage } from '../publishable';
import type { ProducedInstrument } from '../recipient-contract';
import { templatePlacement } from './template-pdf';

/**
 * Everything the gate needs to say whether this template may be published.
 *
 * `assertMcaPackagePublishable` is a pure rule and deliberately knows nothing
 * about where its inputs come from (ADR 0020 §3.2, and #288). This is where
 * they come from — one place, so a second caller cannot assemble a subtly
 * different package and get a different answer about the same template.
 *
 * IT IS EXPECTED TO REFUSE. No clause carries a counsel approval yet, so every
 * clause in every package fails the first check. That is the designed state:
 * ADR 0023 says the gate ships shut and stays shut until counsel approves
 * clauses, and a gate that passed today would be measuring nothing.
 */

/**
 * The clauses actually in this document, as the library holds them.
 *
 * The snapshot carries a projection — numbered, with values resolved — and the
 * gate needs the real `McaContent`, because what it checks is the approval
 * fingerprint over the authored words. Matching by slug against the
 * instrument's own catalogue keeps those two from drifting.
 */
const clausesIn = (
  snapshot: McaTemplateSnapshot,
  instrument: ProducedInstrument,
): { slug: string; content: McaContent }[] => {
  const document = snapshot.documents.find((candidate) => candidate.instrument === instrument);

  if (!document) {
    return [];
  }

  const bySlug = new Map(contentFor(instrument).map((entry) => [entry.slug, entry]));

  return document.items.flatMap((item) => {
    const content = bySlug.get(item.slug);

    return content ? [{ slug: item.slug, content }] : [];
  });
};

export const mcaPublishablePackageFor = async (
  snapshot: McaTemplateSnapshot,
  instrument: ProducedInstrument,
): Promise<McaPublishablePackage> => {
  const items = clausesIn(snapshot, instrument);
  const approvals = await loadMcaClauseApprovals();
  const placement = templatePlacement(snapshot, instrument);

  /*
    AGGREGATED ACROSS THE PACKAGE, WHICH IS COARSER THAN THE LIBRARY PAGE.

    `clause-library-router.ts` counts findings per clause, because a reviewer
    reading one clause wants that clause's objections. The gate's contract is
    package-level: one set of findings applied to every item. For an
    all-or-nothing publication that is the right OUTCOME — a package with one
    objected clause must not publish — but the per-clause REASON it reports is
    coarse, and will name a finding raised against a different clause.

    Recorded rather than worked around: narrowing it means changing the gate's
    shape, which is a change to a reviewed security boundary and belongs in its
    own conversation.
  */
  const slugs = items.flatMap(({ content }) => contentFindingSlugs(content));
  const targets = items.flatMap(({ content }) => libraryFindingHoldTargets(content));

  const [libraryFindings, packageFindings] = await Promise.all([
    prisma.bizrethinkMcaLibraryFinding.count({ where: { clauseSlug: { in: slugs }, answeredAt: null } }),
    prisma.bizrethinkMcaPackageFinding.count({
      where: { review: { kind: 'library', teamId: null }, targetIds: { hasSome: targets }, answeredAt: null },
    }),
  ]);

  return {
    items,
    approvals,
    /*
      A template has no deal, so it has none of the blockers a filled draft had.
      What it can have is a field it can neither mark nor print — a hole in the
      document that no caller could fill, because there is no widget to send a
      value to. Reported as a missing input, which is what it is.
    */
    blockers: [],
    missing: placement.unplaced.map((binding) => ({ binding })),
    outstandingFindings: items.flatMap(({ content }) => outstandingFindingsFor(content)),
    /*
      An unreadable register returns an empty findings list, which is
      indistinguishable from a clean library. Passed in rather than read inside
      the rule, so the rule stays pure and the environment fact stays at the
      edge — the same split `clause-library-router.ts` makes.
    */
    evidenceAvailable: REGISTER_AVAILABLE,
    unansweredCounselFindings: libraryFindings + packageFindings,
  };
};
