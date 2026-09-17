import type { McaInstrument } from '../clauses/instruments';
import { compileMcaTemplate } from './compile';
import { providerFixture } from './profile.fixture';

/**
 * A provider programme that offers every document the builder produces.
 *
 * Ported out of `transactions/draft.fixture.ts` when ADR 0025 retired the deal
 * path. That fixture built a compiled template AND a merchant's answers; only
 * the first half describes a template, and only the first half survives.
 *
 * It exists because most compiled fixtures are an FRPA and little else, so a
 * bug in the equipment, channel or report documents had nowhere to show itself.
 * Synthetic throughout — never a product default, and never evidence of an
 * offer, a signing or an acceptance.
 */
export const allOptionsTemplateFixture = (instrument: McaInstrument = 'frpa') => {
  const profile = providerFixture();

  profile.buyer.servicingPhone = '+1 555 010 0200';

  const {
    reconciliationEmail: _email,
    reconciliationAddress: _address,
    servicingPhone: _phone,
    ...entity
  } = profile.buyer;

  return compileMcaTemplate(
    {
      ...profile,
      policy: {
        ...profile.policy,
        equipment: 'merchant-elects',
        brokerChannel: true,
        consumerReportPulled: true,
      },
      equipmentProvider: {
        ...entity,
        legalName: 'Example Equipment LLC',
        entityType: 'limited liability company',
        creditDisputeAddress: 'PO Box 50, Dover, DE 19901',
      },
      broker: {
        company: { ...entity, legalName: 'Example Channel Inc.' },
        portalUrl: 'https://partners.example.invalid',
        commissionPercentage: 2.75,
        fixedIsoTermsAccepted: true,
      },
    },
    instrument,
  );
};

/**
 * Every document this programme is entitled to, compiled separately.
 *
 * ADR 0026 retired the package, so a test that wants to look across documents
 * compiles each one — which is what the caller does, and what publishing does.
 */
export const allOptionsDocuments = (instruments: McaInstrument[]) =>
  instruments.map((instrument) => allOptionsTemplateFixture(instrument).documents[0]);
