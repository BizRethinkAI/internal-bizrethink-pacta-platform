import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { RecipientRole } from '@prisma/client';
import { beforeAll, describe, expect, it } from 'vitest';

import { PICANA_FACTS, PICANA_MONEY, PICANA_PARTIES, PICANA_VALUES } from '../matters/picana-ln';
import type { RenderLeaseResult } from '../render/render-lease';
import { renderLease } from '../render/render-lease';
import { buildEnvelopeInput } from '../server-only/create-envelope-from-matter';

/**
 * Handing the rendered lease to upstream's `createEnvelope`.
 *
 * The load-bearing detail is recipient ordering. Upstream resolves a
 * placeholder to a recipient BY INDEX — `r1` becomes `recipients[0]`, `r2`
 * becomes `recipients[1]`, and so on (see `findRecipientByPlaceholder`). Our
 * signature blocks assign `r1..rN` over the party list in order. If those two
 * orderings ever diverge, the envelope still creates successfully and every
 * signature field is simply attached to the wrong person — no error, a
 * countersigned lease with the landlord's signature in the tenant's block.
 *
 * So the ordering is asserted here rather than assumed.
 */

let result: RenderLeaseResult;
let placeholdersByKey: Record<string, Awaited<ReturnType<typeof extractPlaceholdersFromPDF>>>;

const TENANTS = [
  { name: 'Alex Roe', role: 'tenant' as const },
  { name: 'Blair Roe', role: 'tenant' as const },
];

const PARTIES = [PICANA_PARTIES[0], PICANA_PARTIES[1], ...TENANTS];

const documentDataIds: Record<string, string> = {};

beforeAll(async () => {
  result = await renderLease({
    facts: PICANA_FACTS,
    money: PICANA_MONEY,
    values: {
      ...PICANA_VALUES,
      landlordKnowsOfFlooding: 'has no',
      landlordFiledFloodClaim: 'has not',
      landlordReceivedFloodAssistance: 'has not',
    },
    parties: PARTIES,
    propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
  });

  placeholdersByKey = {};

  for (const doc of result.rendered) {
    placeholdersByKey[doc.key] = await extractPlaceholdersFromPDF(doc.pdf);
    documentDataIds[doc.key] = `dd_${doc.key}`;
  }
}, 90_000);

const build = () =>
  buildEnvelopeInput({
    rendered: result.rendered,
    placeholdersByKey,
    documentDataIds,
    parties: PARTIES,
    emails: {
      'Shwet Prabhat': 'shwet@example.com',
      'Ambika Prabhat': 'ambika@example.com',
      'Alex Roe': 'alex@example.com',
      'Blair Roe': 'blair@example.com',
    },
    userId: 1,
    teamId: 2,
    title: 'Residential Lease — 29090 Picana Lane',
    readyToSend: result.readyToSend,
  });

describe('recipients', () => {
  it('orders recipients exactly as the parties are numbered', () => {
    // r1..r4 map to recipients[0..3] by index upstream, so this ordering IS
    // the field-to-signer mapping.
    expect(build().data.recipients?.map((r) => r.name)).toEqual([
      'Shwet Prabhat',
      'Ambika Prabhat',
      'Alex Roe',
      'Blair Roe',
    ]);
  });

  it('resolves every placeholder to the party it names', () => {
    const input = build();
    const recipients = input.data.recipients ?? [];

    for (const [key, placeholders] of Object.entries(placeholdersByKey)) {
      for (const placeholder of placeholders) {
        const index = Number(placeholder.recipient.slice(1)) - 1;

        expect(recipients[index], `${key} ${placeholder.placeholder}`).toBeDefined();
      }
    }
  });

  it('makes every party a signer', () => {
    for (const recipient of build().data.recipients ?? []) {
      expect(recipient.role).toBe(RecipientRole.SIGNER);
    }
  });

  it('gives every recipient an email', () => {
    for (const recipient of build().data.recipients ?? []) {
      expect(recipient.email).toMatch(/@/);
    }
  });
});

describe('envelope items', () => {
  it('creates one item per document, lease first', () => {
    expect(build().data.envelopeItems.map((i) => i.title)).toEqual([
      'Residential Lease',
      'Pet Addendum',
      'Early Termination Addendum',
      'House Rules',
      'Flood Disclosure',
    ]);
  });

  it('keeps the flood disclosure a separate item rather than lease pages', () => {
    // Fla. Stat. §83.512 requires a separate written disclosure. Appending it
    // to the lease PDF would make it pages of the lease.
    const items = build().data.envelopeItems;
    const flood = items.find((i) => i.title === 'Flood Disclosure');

    expect(flood).toBeDefined();
    expect(flood?.documentDataId).toBe('dd_disclosure:disclosure.flood');
  });

  it('attaches each document its own placeholders', () => {
    const items = build().data.envelopeItems;

    for (const item of items) {
      expect(item.placeholders?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('carries every placeholder through to the envelope', () => {
    const total = Object.values(placeholdersByKey).reduce((n, p) => n + p.length, 0);
    const carried = build().data.envelopeItems.reduce((n, i) => n + (i.placeholders?.length ?? 0), 0);

    expect(carried).toBe(total);
  });
});

describe('refusing to send an unfinished lease', () => {
  it('throws when a declared variable is still unfilled', () => {
    // A raw {{token}} reaching a real signer is the failure this guards.
    expect(() =>
      buildEnvelopeInput({
        rendered: result.rendered,
        placeholdersByKey,
        documentDataIds,
        parties: PARTIES,
        emails: {},
        userId: 1,
        teamId: 2,
        title: 'x',
        readyToSend: false,
      }),
    ).toThrow(/not ready to send/i);
  });

  it('throws when a party has no email', () => {
    expect(() =>
      buildEnvelopeInput({
        rendered: result.rendered,
        placeholdersByKey,
        documentDataIds,
        parties: PARTIES,
        emails: { 'Shwet Prabhat': 'shwet@example.com' },
        userId: 1,
        teamId: 2,
        title: 'x',
        readyToSend: true,
      }),
    ).toThrow(/Ambika Prabhat/);
  });
});
