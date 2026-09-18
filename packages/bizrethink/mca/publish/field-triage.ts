import { contentFor } from '../catalogue';
import { MCA_ENTITY_BINDINGS } from '../entities/entity';
import { fieldPlanFor } from './field-plan';
import type { ProducedInstrument } from './recipient-contract';

/**
 * The parity gap the other way round, and the larger one.
 *
 * `field-plan.ts` takes the names the live templates carry and asks what the
 * builder can produce for each. This asks the reverse, and the answer is worse:
 * the builder's documents contain **deal fields the live templates have no
 * widget for at all**. Publish one today and a merchant is handed blanks where
 * those fields sit, and nothing on the sending side could fill them, because
 * there is nothing to send them to.
 *
 * That is not a defect in the clause library. ADR 0012 retired fidelity to the
 * v4 documents, and the itemization and offer detail authored since is the
 * point of having a clause library rather than six Word files. It is a
 * consequence that has to be settled before publication, and this is where the
 * settlement is written down.
 *
 * THE CLASSIFICATION IS A JUDGEMENT. Its test checks that it is complete and
 * consistent, never that it is right. The entries marked ARGUABLE below are the
 * ones where a reasonable person would put it in the other column.
 */
export type FieldTriage =
  /** A term of the funder's programme: same on every deal, so the provider profile holds it and the builder sets it in type at publication. No widget, no caller change. */
  | { kind: 'programme'; why: string }
  /** Genuinely per merchant, so it needs a NEW widget name — a change in a repository this session does not own. */
  | { kind: 'per-deal'; widget: string; why: string }
  /** Drives selection or validation; never printed. */
  | { kind: 'control'; why: string }
  /** A second binding for a fact another binding already carries. */
  | { kind: 'duplicate'; why: string };

const programme = (why: string): FieldTriage => ({ kind: 'programme', why });
const perDeal = (widget: string, why: string): FieldTriage => ({ kind: 'per-deal', widget, why });

export const FIELD_TRIAGE: Record<string, FieldTriage> = {
  // ---------------------------------------------------------------- programme
  'funding.conditions': programme(
    'The conditions a funding must satisfy before it is released. A rule of the programme, not a term negotiated per merchant.',
  ),
  // ARGUABLE. A funding deadline could be quoted per deal. Read as a standing
  // rule — funds released by a stated time on a stated day — it is programme.
  'funding.deadline': programme('When funds are released, stated once as a rule of the programme.'),
  'funding.exhibits': programme(
    'Which exhibits this template includes, and at what version. A property of the template itself.',
  ),
  'funding.financeChargeMethod': programme(
    'The jurisdiction, product and calculation method behind a supplied figure. A statement about how the funder computes, not about one merchant.',
  ),
  'equipment.insuranceRequirements': programme(
    'The coverage and amount the funder requires, set once for the programme.',
  ),
  'equipment.taxBasis': programme('The tax jurisdiction, base and rate the schedule is computed on.'),
  'equipment.returnAddress': programme('Where equipment goes back to: the funder’s own address.'),
  'equipment.compatibility': programme(
    'The compatibility the funder commits to expressly, for the equipment it places.',
  ),
  'equipment.softwareSchedule': programme(
    'Rights granted, third-party terms and support — the same for everyone taking the equipment.',
  ),
  'equipment.supplierWarranties': programme('The supplier’s warranties and the service process behind them.'),
  'equipment.lossPayee': programme('Who is named loss payee and holds the insurable interest: the funder.'),
  'report.reportingAgency': programme('Which consumer reporting agency the funder uses.'),

  // ----------------------------------------------------------------- per-deal
  'funding.offerExpiresAt': perDeal('offer_expires_at', 'When this offer lapses. Specific to the offer being made.'),
  'funding.otherDeductions': perDeal(
    'other_deductions',
    'Each payee, purpose and amount deducted from this funding. Itemization detail, and different every time.',
  ),
  'funding.priorUnpaidCharges': perDeal(
    'prior_unpaid_charges',
    'Unpaid charges from a prior transaction, identified separately.',
  ),
  'funding.priorReceivablesSettlement': perDeal(
    'prior_receivables_settlement',
    'What is being settled out of this funding, where a prior purchase exists.',
  ),
  'funding.priorSettlementDetails': perDeal(
    'prior_settlement_details',
    'The prior counterparty, settlement method and payment instructions.',
  ),
  'funding.priorTransactionTreatment': perDeal(
    'prior_transaction_treatment',
    'How the prior transaction is treated under the elected rollover method, stated for this deal.',
  ),
  'broker.compensation': perDeal(
    'broker_compensation',
    'Which broker brought this deal and what they are paid. The state disclosure templates already use this exact name.',
  ),
  'merchant.designatedEmail': perDeal(
    'merchant_designated_email',
    'A different address for notices, where the merchant designates one.',
  ),
  'merchant.designatedNoticeAddress': perDeal(
    'merchant_designated_notice_address',
    'A different postal address for notices, where the merchant designates one.',
  ),
  'merchant.principalState': perDeal(
    'merchant_principal_state',
    'The state of the principal place of business. The venue guard turns on it, and it is only inside the free-text address today — which is precisely why the guard could not read it.',
  ),
  'guarantor.signerName': perDeal(
    'guarantor_signer_name',
    'Where the guarantor is an entity, the individual signing for it — a different person from the guarantor.',
  ),
  'guarantor.email': perDeal(
    'guarantor_email',
    'The guarantor’s address for notices. The FRPA already uses this name; the lease has no widget for it.',
  ),
  'guarantor.signerCapacity': perDeal(
    'guarantor_title',
    'The capacity the guarantor signs in. The FRPA already uses this name.',
  ),
  'transaction.reference': perDeal('transaction_reference', 'The transaction this permission is given for.'),
  'equipment.agreementNumber': perDeal(
    'equipment_agreement_number',
    'The number this equipment agreement is filed under.',
  ),
  'equipment.deliveryCharge': perDeal('equipment_delivery_charge', 'Delivery charged on this schedule.'),
  'equipment.deliveryDate': perDeal(
    'equipment_delivery_date',
    'When the equipment actually arrived, recorded on delivery.',
  ),
  'equipment.estimatedTaxes': perDeal('equipment_estimated_taxes', 'Estimated taxes on this schedule.'),
  'equipment.finalPaymentDate': perDeal(
    'equipment_final_payment_date',
    'The last scheduled payment date for this term.',
  ),
  'equipment.installationCharge': perDeal('equipment_installation_charge', 'Installation charged on this schedule.'),
  'equipment.interimCharge': perDeal('equipment_interim_charge', 'The itemized interim charge for this schedule.'),
  'equipment.paymentSchedule': perDeal(
    'equipment_payment_schedule',
    'Each amount and due date, including the initial payment.',
  ),
  'equipment.purchasePrice': perDeal(
    'equipment_purchase_price',
    'The completion purchase price — $1 on a lease, $0 on a subscription.',
  ),
  'equipment.scheduledDeliveryDate': perDeal(
    'equipment_scheduled_delivery_date',
    'The delivery date agreed for this order.',
  ),
  'equipment.scheduledTotal': perDeal('equipment_scheduled_total', 'The supplied itemized scheduled total.'),
  'equipment.serialNumbers': perDeal(
    'equipment_serial_numbers',
    'The serial numbers of the units delivered, recorded on delivery.',
  ),
  'merchant.formationState': perDeal(
    'merchant_state_of_incorporation',
    'Where the merchant is formed. The FRPA already uses this name; the lease has no widget for it, and giving it the same one is how the templates stay legible to a single caller.',
  ),

  // ------------------------------------------------------------ control / dup
  'guarantor.kind': {
    kind: 'control',
    why: 'Individual or entity. It decides which guarantor fields are required (`requiredWhen`) and is never printed, so it needs no widget on any template.',
  },
  'merchant.signerCapacity': {
    kind: 'duplicate',
    why: 'The same fact as signers.merchant.capacity, which the live templates already call merchant_signer_title. Two bindings for one fact is how the two come to disagree; the signer one should win.',
  },
};

/**
 * Deal fields this instrument prints that no live widget can fill.
 *
 * Derived rather than listed, so the triage cannot quietly fall behind the
 * library: a clause that gains a field makes this grow, and the test then fails
 * until somebody says which kind it is.
 */
export const unreachableDealFields = (instrument: ProducedInstrument): string[] => {
  const plan = fieldPlanFor(instrument);
  const marked = new Set(plan.marked.map((field) => field.binding));
  const signer = new Set(plan.signers.flatMap((party) => [`${party.signs}.signature`, `${party.signs}.signedDate`]));
  const found = new Set<string>();

  for (const entry of contentFor(instrument)) {
    for (const field of entry.fields ?? []) {
      if (!marked.has(field.binding) && !signer.has(field.binding) && !MCA_ENTITY_BINDINGS.has(field.binding)) {
        found.add(field.binding);
      }
    }
  }

  return [...found].sort();
};

/**
 * The new widget names `lombard-platform` would have to learn.
 *
 * The only part of this that costs anybody outside this repository anything,
 * which is why it is worth being able to print on its own.
 */
export const newWidgetNames = (): { binding: string; widget: string; why: string }[] =>
  Object.entries(FIELD_TRIAGE)
    .flatMap(([binding, triage]) =>
      triage.kind === 'per-deal' ? [{ binding, widget: triage.widget, why: triage.why }] : [],
    )
    .sort((a, b) => a.widget.localeCompare(b.widget));
