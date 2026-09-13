import type { McaProviderProfile } from './profile';

export const providerFixture = (): McaProviderProfile => ({
  label: 'Synthetic provider programme',
  buyer: {
    legalName: 'Example Receipts Inc.',
    entityType: 'corporation',
    organizationState: 'DE',
    address: '10 Example Street, Dover, DE 19901',
    noticeAddress: 'PO Box 20, Dover, DE 19901',
    noticeEmail: 'notices@example.invalid',
    reconciliationEmail: 'reconciliation@example.invalid',
    reconciliationAddress: '10 Example Street, Dover, DE 19901',
  },
  policy: {
    collectionMethod: 'split-only',
    settlementBase: 'net',
    venueRule: 'merchant-state',
    supportedTermsConfirmed: true,
    guarantyScope: 'limited-conduct',
    equipment: 'none',
    renewalModel: 'payoff-only',
    concurrentPositions: false,
    disputeResolution: 'courts',
    recipientStates: ['US-CA', 'US-FL'],
    brokerChannel: false,
    consumerReportPulled: false,
  },
  equipmentProvider: null,
  broker: null,
  processor: {
    legalName: 'Example Processor Inc.',
    requiredForm: {
      title: 'Processor-controlled split authorization',
      version: '2026-09',
      reference: 'Provider form register / split authorization',
    },
  },
});
