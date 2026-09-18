import type { McaEntityInput } from './entity';

/**
 * A complete entity, synthetic throughout.
 *
 * Never a product default and never evidence of an offer, a signing or an
 * acceptance. `example.invalid` is reserved by RFC 2606 precisely so a fixture
 * cannot reach a real mailbox.
 */
export const entityFixture = (): McaEntityInput => ({
  label: 'Example Receipts Inc.',
  identity: {
    legalName: 'Example Receipts Inc.',
    entityType: 'corporation',
    organizationState: 'Delaware',
    address: '10 Example Street, Dover, DE 19901',
    noticeEmail: 'notices@example.invalid',
    noticeAddress: 'PO Box 10, Dover, DE 19901',
    reconciliationEmail: 'reconciliation@example.invalid',
    reconciliationAddress: 'PO Box 11, Dover, DE 19901',
    servicingPhone: '+1 555 010 0200',
    venueState: '',
    venueCounty: '',
    website: 'https://example.invalid',
    partnerPortalUrl: 'https://partners.example.invalid',
    creditDisputeAddress: 'PO Box 50, Dover, DE 19901',
  },
  policy: {
    collectionMethod: 'split-only',
    settlementBase: 'net',
    venueRule: 'merchant-state',
    disputeResolution: 'courts',
    guarantyScope: 'limited-conduct',
    renewalModel: 'payoff-only',
    concurrentPositions: false,
    equipment: 'none',
    brokerChannel: false,
    consumerReportPulled: false,
    supportedTermsConfirmed: true,
    recipientStates: ['US-FL', 'US-NY'],
    fees: [],
  },
});
