import { MCA_REPORT_FIELDS, mcaExecutionFields } from '../clauses/fields';
import type { McaReusableContent } from '../clauses/types';

/** These blocks record who must execute; granting authority or a signature remains a separate event. */
const execution = (
  instrument: 'frpa' | 'equipment-lease' | 'subscription' | 'iso-pra' | 'permission-to-release',
  section: string,
  roles: Parameters<typeof mcaExecutionFields>[0],
  derivedFrom: string[],
): McaReusableContent => ({
  slug: `${instrument}.execution-fields`,
  instrument,
  section,
  sortKey: 9990,
  version: 1,
  kind: 'field-group',
  heading: 'Separate execution capacities',
  body: '',
  includeWhen: null,
  uses: ['document', 'template'],
  placement: { section, edge: 'end' },
  fields: mcaExecutionFields(roles),
  whyThisClause: { kind: 'discretionary' },
  variance: {
    kind: 'fixed',
    because: 'load-bearing',
    note: 'Each contracting party executes through the identified signer and capacity. A business signature, personal guaranty and individual-report instruction remain separate acts even when the same person performs more than one.',
  },
  source: { kind: 'attorney-drafted', author: null },
  status: 'draft',
  appliesInStates: [],
  examinedBy: [],
  derivedFrom,
});

export const MCA_EXECUTION_CONTENT: McaReusableContent[] = [
  execution('frpa', 'execution', ['merchant', 'buyer'], ['frpa.execution']),
  execution(
    'equipment-lease',
    'guaranty',
    ['merchant', 'equipmentProvider'],
    ['equipment-lease.parties', 'equipment-lease.acknowledgment'],
  ),
  execution(
    'subscription',
    'guaranty',
    ['merchant', 'equipmentProvider'],
    ['subscription.parties', 'subscription.acknowledgment'],
  ),
  execution('iso-pra', 'general', ['isoCompany', 'isoPartner'], ['iso-pra.parties']),
  {
    ...execution('permission-to-release', 'authorisations', ['merchant'], ['permission-to-release.personal-guarantor']),
    fields: [
      ...mcaExecutionFields(['merchant']),
      {
        binding: 'report.subjectName',
        widget: '{{field:report.subjectName}}',
        label: 'Individual Report Subject — Printed Name',
        kind: 'text',
        required: true,
      },
      {
        binding: 'report.signature',
        widget: '{{field:report.signature}}',
        label: 'Individual Report Subject — Separate Individual Instructions Signature',
        kind: 'signature',
        required: true,
      },
      {
        binding: 'report.signedDate',
        widget: '{{field:report.signedDate}}',
        label: 'Individual Report Subject — Signature Date',
        kind: 'date',
        required: true,
      },
    ],
  },
  {
    slug: 'permission-to-release.transaction-fields',
    version: 1,
    instrument: 'permission-to-release',
    kind: 'field-group',
    section: 'authorisations',
    sortKey: 0,
    heading: 'Identified transaction and individual report instructions',
    body: '',
    includeWhen: null,
    uses: ['document', 'template'],
    placement: { before: 'permission-to-release.preamble' },
    fields: MCA_REPORT_FIELDS,
    whyThisClause: {
      kind: 'implements',
      citation: '15 U.S.C. §1681b(a)(2), (f) (specific individual instructions and permissible use)',
    },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The transaction, individual and reporting agency must be identified before this draft permission can be executed. Entering fields never supplies the individual’s instructions or a permissible purpose.',
    },
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [],
    derivedFrom: [
      'permission-to-release.preamble',
      'permission-to-release.credit-bureau-authorization',
      'permission-to-release.personal-guarantor',
    ],
  },
];
