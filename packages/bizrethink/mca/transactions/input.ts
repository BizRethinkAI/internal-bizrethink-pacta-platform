import { z } from 'zod';

const value = z
  .string()
  .trim()
  .max(1600)
  .refine(
    (text) =>
      !/\{\{|\[\[|«|»/.test(text) &&
      [...text].every((character) => character.charCodeAt(0) >= 32 || character === '\n'),
    'Use plain text without template directives.',
  );
const line = (max = 240) =>
  value.refine((text) => !text.includes('\n') && text.length <= max, 'Use a short single line.');
const person = z
  .object({ name: line(240), email: z.union([z.literal(''), z.string().email().max(254)]), capacity: line(240) })
  .strict();
const guarantor = z
  .object({
    kind: z.enum(['individual', 'entity']),
    legalName: line(240),
    noticeAddress: line(600),
    phone: line(80),
    email: z.union([z.literal(''), z.string().email().max(254)]),
    signerName: line(240),
    signerCapacity: line(240),
  })
  .strict();
const subject = z.object({ name: line(240), reportingAgency: line(240) }).strict();

/** No signatures, acceptance flags, raw private identifiers or provider policy in a draft fill. */
export const ZMcaDraftInput = z
  .object({
    reference: line(120),
    values: z
      .record(z.string().max(100), line(1600))
      .refine((entries) => Object.keys(entries).length <= 180, 'Too many transaction values.'),
    equipmentElection: z.enum(['none', 'cash-purchase', 'lease', 'subscription']),
    includeChannelAgreement: z.boolean(),
    reportSubjects: z.array(subject).max(10),
    guarantors: z
      .object({
        frpa: z.array(guarantor).max(10),
        'equipment-lease': z.array(guarantor).max(10),
        subscription: z.array(guarantor).max(10),
      })
      .strict(),
    signers: z
      .object({ buyer: person, merchant: person, equipmentProvider: person, isoCompany: person, isoPartner: person })
      .strict(),
  })
  .strict();
export type McaDraftInput = z.infer<typeof ZMcaDraftInput>;
export type McaDraftGuarantor = z.infer<typeof guarantor>;

export const emptyMcaDraftInput = (): McaDraftInput => ({
  reference: '',
  values: {},
  equipmentElection: 'none',
  includeChannelAgreement: false,
  reportSubjects: [],
  guarantors: { frpa: [], 'equipment-lease': [], subscription: [] },
  signers: {
    buyer: { name: '', email: '', capacity: '' },
    merchant: { name: '', email: '', capacity: '' },
    equipmentProvider: { name: '', email: '', capacity: '' },
    isoCompany: { name: '', email: '', capacity: '' },
    isoPartner: { name: '', email: '', capacity: '' },
  },
});
