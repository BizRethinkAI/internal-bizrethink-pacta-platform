import type { McaInstrument } from '../clauses/instruments';
import { inReviewOrder } from '../clauses/library';
import type { McaReusableContent } from '../clauses/types';
import { ALL_MCA_REUSABLE } from './records';

export { ALL_MCA_REUSABLE } from './records';
export const reusableFor = (instrument: McaInstrument): McaReusableContent[] =>
  inReviewOrder(ALL_MCA_REUSABLE.filter((entry) => entry.instrument === instrument));
