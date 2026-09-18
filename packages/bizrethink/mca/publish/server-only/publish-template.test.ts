import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  preview: vi.fn(),
  packageFor: vi.fn(),
  gate: vi.fn(),
  artifact: vi.fn(),
  put: vi.fn(),
  createEnvelope: vi.fn(),
  record: vi.fn(),
}));

vi.mock('../../templates/server-only/service', () => ({
  previewMcaTemplate: mocks.preview,
  assertMcaTeamAccess: mocks.access,
}));
vi.mock('./publishable-package', () => ({ mcaPublishablePackageFor: mocks.packageFor }));
vi.mock('../publishable', () => ({ assertMcaPackagePublishable: mocks.gate }));
vi.mock('./artifact', () => ({ buildMcaTemplateArtifact: mocks.artifact }));
vi.mock('@documenso/lib/universal/upload/put-file.server', () => ({ putPdfFileServerSide: mocks.put }));
vi.mock('@documenso/lib/server-only/envelope/create-envelope', () => ({ createEnvelope: mocks.createEnvelope }));
vi.mock('./publications', () => ({ recordMcaPublication: mocks.record }));

import { publishMcaTemplate } from './publish-template';

const metadata = { auditUser: { id: 41, email: null, name: null }, requestMetadata: {}, source: 'app' } as never;
const input = {
  userId: 41,
  teamId: 17,
  id: 'mca-template',
  version: 2,
  instrument: 'frpa' as const,
  requestMetadata: metadata,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.preview.mockResolvedValue({
    fingerprint: 'fp-1',
    entity: { policy: { recipientStates: ['US-VA'], venueRule: 'merchant-state' } },
    documents: [],
  });
  mocks.packageFor.mockResolvedValue({ items: [] });
  mocks.artifact.mockResolvedValue({
    pdf: Buffer.from('%PDF-1.7'),
    placeholders: [{ placeholder: '{{SIGNATURE, r1}}' }],
    widgets: ['merchant_legal_name'],
    signers: [
      { role: 'merchant', token: 'r1' },
      { role: 'guarantor', token: 'r2' },
    ],
  });
  mocks.put.mockResolvedValue({ documentData: { id: 'docdata-1' } });
  mocks.createEnvelope.mockResolvedValue({
    id: 'envelope_abc',
    secondaryId: 'template_121',
    recipients: [
      { id: 1250, signingOrder: 1 },
      { id: 1251, signingOrder: 2 },
    ],
  });
  mocks.record.mockResolvedValue({ id: 'pub-1' });
  mocks.access.mockResolvedValue({ id: 17, organisationId: 'org-a' });
});

/**
 * THE GATE IS FIRST, and nothing happens behind a refusal.
 *
 * It refuses every package today — no clause carries a counsel approval — so
 * this is not a hypothetical path. ADR 0023: it ships shut and stays shut. Put
 * a render or an upload before it and the refusal costs work and, worse, leaves
 * an orphan document in storage nobody will go looking for.
 */
describe('nothing happens behind a refusal', () => {
  it('renders nothing, uploads nothing and creates nothing when the gate throws', async () => {
    mocks.gate.mockImplementation(() => {
      throw new Error('no current attorney approval');
    });

    await expect(publishMcaTemplate(input)).rejects.toThrow(/approval/);

    expect(mocks.artifact).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.createEnvelope).not.toHaveBeenCalled();
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it('judges the package for the instrument being published', async () => {
    await publishMcaTemplate(input);

    expect(mocks.packageFor.mock.calls[0]?.[1]).toBe('frpa');
    expect(mocks.gate).toHaveBeenCalledWith({ items: [] });
  });

  /**
   * ADR 0016 restricts provider policy to a programme's managers because it is
   * the funder's programme. Publishing puts that programme in front of a
   * merchant, so it cannot need less — and the check is in the service rather
   * than a route, so a second caller cannot reach this without it.
   */
  it('refuses anyone without write authority over the team', async () => {
    mocks.access.mockRejectedValue(new Error('MCA templates are unavailable for this team.'));

    await expect(publishMcaTemplate(input)).rejects.toThrow();

    expect(mocks.preview).not.toHaveBeenCalled();
    expect(mocks.gate).not.toHaveBeenCalled();
    expect(mocks.createEnvelope).not.toHaveBeenCalled();
  });

  it('asks for write authority, not merely membership', async () => {
    await publishMcaTemplate(input);

    expect(mocks.access).toHaveBeenCalledWith({ teamId: 17, userId: 41, write: true });
  });

  /**
   * Membership, the draft grant and revision currency are decided by
   * `previewMcaTemplate`. Whatever it refuses, this refuses.
   */
  it('stops on a refusal from the check that owns access', async () => {
    mocks.preview.mockRejectedValue(new Error('Internal draft preview access is required.'));

    await expect(publishMcaTemplate(input)).rejects.toThrow();
    expect(mocks.gate).not.toHaveBeenCalled();
  });
});

describe('what publishing actually creates', () => {
  it('carries the request metadata into the envelope, so the act is auditable', async () => {
    await publishMcaTemplate(input);

    expect(mocks.createEnvelope.mock.calls[0]?.[0].requestMetadata).toBe(metadata);
  });

  it('uploads the artifact and makes a TEMPLATE, not a document', async () => {
    await publishMcaTemplate(input);

    expect(mocks.put).toHaveBeenCalledTimes(1);

    const envelope = mocks.createEnvelope.mock.calls[0]?.[0];

    expect(envelope.data.type).toBe('TEMPLATE');
    expect(envelope.data.envelopeItems[0].documentDataId).toBe('docdata-1');
    expect(envelope.data.envelopeItems[0].placeholders).toEqual([{ placeholder: '{{SIGNATURE, r1}}' }]);
  });

  /**
   * A template's recipients are placeholders, not people — Documenso's own
   * convention, and what the live records show. What must survive publication
   * is the ORDER and the role name: the caller addresses a recipient by role,
   * and `rN` is a position in this list.
   */
  it('creates one placeholder recipient per signer, in signing order', async () => {
    await publishMcaTemplate(input);

    expect(mocks.createEnvelope.mock.calls[0]?.[0].data.recipients).toEqual([
      { email: 'recipient.1@documenso.com', name: 'merchant', role: 'SIGNER', signingOrder: 1 },
      { email: 'recipient.2@documenso.com', name: 'guarantor', role: 'SIGNER', signingOrder: 2 },
    ]);
  });

  /**
   * `secondaryId` is `template_121`; the caller's `/template/use` takes 121.
   * Derived here rather than stored twice, so the record cannot disagree with
   * the envelope about which template it is.
   */
  it('records the numeric id the caller will send, derived from the envelope', async () => {
    const result = await publishMcaTemplate(input);

    expect(result).toEqual({ envelopeId: 'envelope_abc', templateId: 121 });
    expect(mocks.record.mock.calls[0]?.[0]).toMatchObject({
      documensoTemplateId: 121,
      envelopeId: 'envelope_abc',
      templateId: 'mca-template',
      templateRevision: 2,
      instrument: 'frpa',
      fingerprint: 'fp-1',
    });
  });

  it('records the interface and what the template is for', async () => {
    await publishMcaTemplate(input);

    const written = mocks.record.mock.calls[0]?.[0];

    expect(written.widgets).toEqual(['merchant_legal_name']);
    expect(written.recipientStates).toEqual(['US-VA']);
    expect(written.venueRule).toBe('merchant-state');
  });

  /**
   * The recipient ids the caller sends back come from the envelope that was
   * just created, matched by signing order — the only thing both lists agree
   * on by construction.
   */
  it('records each signer against the recipient id the envelope gave it', async () => {
    await publishMcaTemplate(input);

    expect(mocks.record.mock.calls[0]?.[0].recipients).toEqual([
      { role: 'merchant', signingOrder: 1, recipientId: 1250 },
      { role: 'guarantor', signingOrder: 2, recipientId: 1251 },
    ]);
  });

  /** The record is written last: there is nothing to record until it exists. */
  it('records only after the envelope exists', async () => {
    await publishMcaTemplate(input);

    expect(mocks.createEnvelope.mock.invocationCallOrder[0]).toBeLessThan(mocks.record.mock.invocationCallOrder[0]);
  });
});
