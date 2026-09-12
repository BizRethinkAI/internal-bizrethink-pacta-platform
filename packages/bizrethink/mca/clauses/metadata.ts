import type { McaFacts } from './facts';
import type { ClauseVariance, WhyThisClause } from './types';

/** Shared reviewer labels. These assessments do not approve the clause. */
export const describeWhyThisClause = (why: WhyThisClause): string => {
  switch (why.kind) {
    case 'compelled':
      return `Required wording — ${why.citation}. Applies when: ${why.appliesWhen}`;
    case 'implements':
      return `Implements a legal duty; wording is ours — ${why.citation}.`;
    case 'discretionary':
      return 'Commercial drafting — no statute requires this clause.';
  }
};

export const describeClauseVariance = (variance: ClauseVariance): string =>
  variance.kind === 'fixed' ? `Fixed wording — ${variance.note}` : `Funder choice — ${FACT_LABELS[variance.fact]}.`;

const FACT_LABELS: Record<keyof McaFacts, string> = {
  collectionMethod: 'Collection method',
  guarantyScope: 'Guaranty scope',
  settlementBase: 'Settlement base',
  equipment: 'Equipment offering',
  renewalModel: 'Renewal model',
  concurrentPositions: 'Concurrent purchases',
  disputeResolution: 'Dispute resolution',
  venueRule: 'Court location',
  recipientStates: 'Recipient states',
  brokerChannel: 'Broker channel',
  consumerReportPulled: 'Consumer-report use',
  processorSplitAccepted: 'Processor acceptance',
};
