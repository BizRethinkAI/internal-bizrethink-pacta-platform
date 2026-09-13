import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { McaInstrument } from '../clauses/instruments';
import type { ClauseField } from '../clauses/types';
import type { McaTemplateDocument, McaTemplateItem, McaTemplateSnapshot } from '../templates/compile';
import { MCA_PROVIDER_BINDINGS } from '../templates/profile';
import { type McaDraftGuarantor, type McaDraftInput, ZMcaDraftInput } from './input';

type MissingValue = { document: string; binding: string; label: string; inputPath: string };
export type McaDraftSignature = {
  role: string;
  partyName: string;
  signerName: string;
  capacity: string;
  email: string;
};
export type McaDraftDocument = Omit<McaTemplateDocument, 'items'> & {
  id: string;
  items: McaTemplateItem[];
  signatures: McaDraftSignature[];
};
const invalid = (message: string): never => {
  throw new AppError(AppErrorCode.INVALID_REQUEST, { message });
};
const unsigned = (field: ClauseField) => field.kind === 'signature' || field.binding.endsWith('.signedDate');

/** The form exposes current semantic bindings only. Repeated guarantors have their own input path. */
export const mcaDraftControls = (template: McaTemplateSnapshot) => {
  const byBinding = new Map<string, ClauseField & { instrument: McaInstrument }>();
  for (const document of template.documents) {
    for (const item of document.items) {
      if (item.repeatFor) {
        continue;
      }
      for (const field of item.fields) {
        if (
          field.value !== null ||
          unsigned(field) ||
          MCA_PROVIDER_BINDINGS.has(field.binding) ||
          field.binding.startsWith('signers.') ||
          field.binding.startsWith('report.') ||
          field.binding === 'transaction.reference' ||
          field.binding === 'merchant.signerCapacity' ||
          byBinding.has(field.binding)
        ) {
          continue;
        }
        byBinding.set(field.binding, { ...field, instrument: document.instrument });
      }
    }
  }
  return [...byBinding.values()];
};

const validateField = (field: ClauseField, value: string) => {
  if (!value) {
    return;
  }
  if (field.kind === 'currency' && !/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(value)) {
    invalid(
      `${field.label}: enter a nonnegative decimal amount without commas or exponent notation, with at most two decimal places.`,
    );
  }
  if (
    field.kind === 'date' &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ||
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)
  ) {
    invalid(`${field.label}: enter a real calendar date as YYYY-MM-DD.`);
  }
  if (
    field.binding === 'funding.specifiedPercentage' &&
    (!/^\d{1,3}(\.\d{1,6})?$/.test(value) || Number(value) <= 0 || Number(value) > 100)
  ) {
    invalid(
      'The specified percentage must be greater than zero and no more than 100, entered as a decimal percentage.',
    );
  }
  if (field.binding === 'merchant.documentTaxIdentifier' && !/^(\d{2}-\d{7}|\*{4}\d{0,4})$/.test(value)) {
    invalid(
      'The document tax identifier must be a designated EIN (12-3456789) or a masked value (****1234), never a full personal SSN.',
    );
  }
  if (field.binding === 'account.documentIdentifier' && !/^\*{4}\d{0,4}$/.test(value)) {
    invalid('Use a masked deposit-account identifier, such as ****1234.');
  }
  if (field.binding === 'account.routingNumber' && !/^\d{9}$/.test(value)) {
    invalid('The routing number must contain nine digits.');
  }
};

const guarantorsFor = (input: McaDraftInput, instrument: McaInstrument): McaDraftGuarantor[] =>
  instrument === 'frpa' || instrument === 'equipment-lease' || instrument === 'subscription'
    ? input.guarantors[instrument]
    : [];

const documentIncluded = (document: McaTemplateDocument, input: McaDraftInput) => {
  switch (document.transactionSelection) {
    case 'equipment-lease':
      return input.equipmentElection === 'lease';
    case 'subscription':
      return input.equipmentElection === 'subscription';
    case 'individual-report':
      return input.reportSubjects.length > 0;
    case 'broker-channel':
      return input.includeChannelAgreement;
    default:
      return true;
  }
};

/** This is a review copy; neither an internal grant nor entered values authorize signing or delivery. */
export const fillMcaDraft = (template: McaTemplateSnapshot, raw: unknown) => {
  const input = ZMcaDraftInput.parse(raw);
  if (template.profile.policy.equipment === 'none' && input.equipmentElection !== 'none') {
    invalid('This provider template does not offer equipment.');
  }
  if (!template.profile.policy.consumerReportPulled && input.reportSubjects.length) {
    invalid('This provider template does not offer individual-report instructions.');
  }
  if (!template.profile.policy.brokerChannel && input.includeChannelAgreement) {
    invalid('This provider template does not include an ISO channel agreement.');
  }
  if (template.profile.policy.guarantyScope === 'none' && input.guarantors.frpa.length) {
    invalid('This provider template has no FRPA guaranty.');
  }
  if (
    (input.equipmentElection !== 'lease' && input.guarantors['equipment-lease'].length) ||
    (input.equipmentElection !== 'subscription' && input.guarantors.subscription.length)
  ) {
    invalid('Guarantors must belong to the equipment instrument actually selected.');
  }
  const controls = new Map(mcaDraftControls(template).map((field) => [field.binding, field]));
  for (const [binding, value] of Object.entries(input.values)) {
    const field = controls.get(binding);
    if (!field) {
      return invalid(`This template does not allow the transaction to set ${binding}.`);
    }
    validateField(field, value);
  }
  const values = { ...input.values };
  // These zeros follow the actual no-charge election; they are not finance-charge calculations.
  if (input.equipmentElection !== 'cash-purchase') {
    for (const binding of ['equipment.upfrontCharge', 'equipment.deferredCharge']) {
      if (values[binding] && !/^0(?:\.0{1,2})?$/.test(values[binding])) {
        invalid(
          'A no-equipment, lease or subscription election cannot deduct equipment at FRPA funding or add deferred equipment to purchased receipts.',
        );
      }
      values[binding] = '0.00';
    }
  }
  const missing: MissingValue[] = [];
  if (!input.reference) {
    missing.push({ document: 'package', binding: 'reference', label: 'Transaction reference', inputPath: 'reference' });
  }
  const addMissing = (
    document: string,
    field: ClauseField,
    value: string | null,
    inputPath: string,
    guarantor?: McaDraftGuarantor,
  ) => {
    const required = field.required || (field.requiredWhen && guarantor?.kind === field.requiredWhen.equals);
    if (required && !unsigned(field) && !value) {
      missing.push({ document, binding: field.binding, label: field.label, inputPath });
    }
  };
  const documents: McaDraftDocument[] = [];
  for (const document of template.documents.filter((document) => documentIncluded(document, input))) {
    const subjects = document.instrument === 'permission-to-release' ? input.reportSubjects : [null];
    for (const [subjectIndex, subject] of subjects.entries()) {
      const id =
        document.instrument === 'permission-to-release'
          ? `${document.instrument}-${subjectIndex + 1}`
          : document.instrument;
      const context: Record<string, string> = {
        ...values,
        'merchant.signerCapacity': input.signers.merchant.capacity,
        ...Object.fromEntries(
          Object.entries(input.signers).flatMap(([role, person]) =>
            Object.entries(person).map(([key, value]) => [`signers.${role}.${key}`, value]),
          ),
        ),
        'transaction.reference': input.reference,
        'report.subjectName': subject?.name ?? '',
        'report.reportingAgency': subject?.reportingAgency ?? '',
      };
      const labels = new Map(
        document.items.flatMap((item) => item.fields.map((field) => [field.binding, field.label])),
      );
      const guarantors = guarantorsFor(input, document.instrument);
      const items: McaTemplateItem[] = [];
      for (const item of document.items) {
        const copies: (McaDraftGuarantor | null)[] = item.repeatFor ? [...guarantors] : [null];
        if (item.repeatFor && !guarantors.length) {
          missing.push({
            document: id,
            binding: `${document.instrument}.guarantors`,
            inputPath: `guarantors.${document.instrument}`,
            label: 'At least one intended guarantor with a separate signature capacity',
          });
          copies.push(null);
        }
        for (const [index, guarantor] of copies.entries()) {
          const filledFields = item.fields.map((field) => {
            const key = field.binding.replace(/^guarantor\./, '') as keyof McaDraftGuarantor;
            const value = unsigned(field)
              ? null
              : (field.value ?? (guarantor ? (guarantor[key] ?? null) : (context[field.binding] ?? null)));
            const inputPath = field.binding.startsWith('guarantor.')
              ? `guarantors.${document.instrument}.${index}.${key}`
              : field.binding.startsWith('report.')
                ? `reportSubjects.${subjectIndex}.${field.binding === 'report.subjectName' ? 'name' : 'reportingAgency'}`
                : field.binding === 'transaction.reference'
                  ? 'reference'
                  : field.binding.startsWith('signers.')
                    ? field.binding
                    : field.binding === 'merchant.signerCapacity'
                      ? 'signers.merchant.capacity'
                      : `values.${field.binding}`;
            addMissing(id, field, value, inputPath, guarantor ?? undefined);
            return { ...field, value };
          });
          const fillText = (text: string) =>
            text.replace(/\{\{field:([^}]+)\}\}/g, (_token, binding: string) => {
              const value = context[binding];
              if (value) {
                return value;
              }
              return `[${labels.get(binding) ?? binding}: to complete]`;
            });
          const body = fillText(item.body);
          items.push({
            ...item,
            slug: item.repeatFor ? `${item.slug}:${index + 1}` : item.slug,
            heading: item.repeatFor ? `${item.heading} — ${guarantor?.legalName || index + 1}` : item.heading,
            body,
            ...(item.reading
              ? {
                  reading: {
                    ...item.reading,
                    segments: item.reading.segments.map((part) =>
                      part.kind === 'text' ? { ...part, text: fillText(part.text) } : part,
                    ),
                  },
                }
              : {}),
            fields: filledFields,
          });
        }
      }
      const signatures: McaDraftSignature[] = [];
      const sign = (
        role: string,
        partyName: string,
        signer: McaDraftInput['signers']['merchant'],
        paths?: Record<string, string>,
      ) => {
        signatures.push({ role, partyName, signerName: signer.name, capacity: signer.capacity, email: signer.email });
        for (const key of ['name', 'email', 'capacity'] as const) {
          if (!signer[key]) {
            missing.push({
              document: id,
              binding: `signers.${role}.${key}`,
              label: `${role}: ${key}`,
              inputPath:
                paths?.[key] ??
                `signers.${({ Merchant: 'merchant', Buyer: 'buyer', 'ISO company': 'isoCompany', 'ISO partner': 'isoPartner', 'Equipment provider': 'equipmentProvider' } as Record<string, string>)[role]}.${key}`,
            });
          }
        }
      };
      if (document.instrument === 'iso-pra') {
        sign('ISO company', template.profile.broker?.company.legalName ?? '', input.signers.isoCompany);
        sign('ISO partner', values['iso.partnerLegalName'] ?? '', input.signers.isoPartner);
      } else {
        sign('Merchant', values['merchant.legalName'] ?? '', input.signers.merchant);
        if (document.instrument === 'frpa') {
          sign('Buyer', template.profile.buyer.legalName, input.signers.buyer);
        }
        if (document.instrument === 'equipment-lease' || document.instrument === 'subscription') {
          sign(
            'Equipment provider',
            template.profile.equipmentProvider?.legalName ?? '',
            input.signers.equipmentProvider,
          );
        }
      }
      for (const [guarantorIndex, guarantor] of guarantors.entries()) {
        sign(
          'Guarantor',
          guarantor.legalName,
          {
            name: guarantor.kind === 'individual' ? guarantor.legalName : guarantor.signerName,
            capacity: guarantor.kind === 'individual' ? 'Individual guarantor' : guarantor.signerCapacity,
            email: guarantor.email,
          },
          {
            name: `guarantors.${document.instrument}.${guarantorIndex}.${guarantor.kind === 'individual' ? 'legalName' : 'signerName'}`,
            email: `guarantors.${document.instrument}.${guarantorIndex}.email`,
            capacity: `guarantors.${document.instrument}.${guarantorIndex}.signerCapacity`,
          },
        );
      }
      if (subject) {
        signatures.push({
          role: 'Individual report subject',
          partyName: subject.name,
          signerName: subject.name,
          capacity: 'Individual report instructions only',
          email: '',
        });
        if (!subject.name || !subject.reportingAgency) {
          missing.push({
            document: id,
            binding: 'report.subject',
            inputPath: `reportSubjects.${subjectIndex}.${!subject.name ? 'name' : 'reportingAgency'}`,
            label: 'The individual report subject and reporting agency',
          });
        }
      }
      documents.push({ ...document, id, items, signatures });
    }
  }
  const blockers = [
    {
      kind: 'legal-review',
      detail:
        'Exact authored content, findings, legal approval and final document layout require clearance before third-party use.',
    },
    {
      kind: 'disclosures',
      detail:
        'Determine transaction nexus/applicability; obtain supplied calculations and every required separate prescribed disclosure, agreement item and delivery record.',
    },
    {
      kind: 'processor-acceptance',
      detail:
        'Obtain and review the actual processor-controlled form/version and record this transaction’s accepted collection instructions.',
    },
    {
      kind: 'signing',
      detail:
        'These are blank signature locations. Use the authorized signing workflow and retain every required separate signature and instruction.',
    },
    ...(input.equipmentElection === 'cash-purchase'
      ? [
          {
            kind: 'equipment-sale',
            detail:
              'Obtain the separate equipment cash-sale agreement and itemized invoice; no cash-sale instrument is authored by this library.',
          },
        ]
      : []),
  ];
  return {
    reference: input.reference,
    templateFingerprint: template.fingerprint,
    documents,
    missing,
    blockers,
    requirements: template.requirements,
    externalDocuments: template.externalDocuments,
    readyToSend: false as const,
    audience: 'internal-draft' as const,
  };
};
export type McaFilledDraft = ReturnType<typeof fillMcaDraft>;
