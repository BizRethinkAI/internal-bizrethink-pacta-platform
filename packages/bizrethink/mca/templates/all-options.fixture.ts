import type { McaInstrument } from '../clauses/instruments';
import { entityFixture } from '../entities/entity.fixture';
import { compileMcaTemplate } from './compile';

/**
 * An entity whose programme offers every document the builder produces.
 *
 * It exists because most compiled fixtures are an FRPA and little else, so a
 * bug in the equipment, channel or report documents had nowhere to show itself.
 * Synthetic throughout — never a product default, and never evidence of an
 * offer, a signing or an acceptance.
 *
 * Under ADR 0026 it no longer invents a separate equipment company or broker:
 * the broker comes from the caller per deal, and an entity that leases
 * equipment IS the lessor on its own equipment template.
 */
export const allOptionsEntity = () => {
  const entity = entityFixture();

  entity.identity.servicingPhone = '+1 555 010 0200';
  entity.policy.equipment = 'merchant-elects';
  entity.policy.brokerChannel = true;
  entity.policy.consumerReportPulled = true;

  return entity;
};

export const allOptionsTemplateFixture = (instrument: McaInstrument = 'frpa') =>
  compileMcaTemplate(allOptionsEntity(), instrument);

/**
 * Every document this programme is entitled to, compiled separately.
 *
 * ADR 0026 retired the package, so a test that wants to look across documents
 * compiles each one — which is what the caller does, and what publishing does.
 */
export const allOptionsDocuments = (instruments: McaInstrument[]) =>
  instruments.map((instrument) => allOptionsTemplateFixture(instrument).documents[0]);
