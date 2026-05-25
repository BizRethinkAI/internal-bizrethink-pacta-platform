import { expect, test } from '@playwright/test';

import { seedUser } from '@documenso/prisma/seed/users';

/**
 * E8 from COVERAGE-PLAN-2026-05-25.md — Pacta-branded email footer
 * (overlay 023 + 021).
 *
 * Sends a forgot-password email (lowest-friction outbound trigger) and
 * fetches it from Inbucket's HTTP API to assert the Pacta branding
 * survives all the rendering layers (template-footer.tsx + the
 * SUPPORT_EMAIL constant chain from overlay 021).
 *
 * Inbucket dev compose: localhost:9000 (HTTP UI + API), 2500 (SMTP).
 * API contract: GET /api/v1/mailbox/{local-part} -> list of message
 * metadata; GET /api/v1/mailbox/{local-part}/{id} -> full message body.
 */

const INBUCKET_BASE = 'http://localhost:9000';

const fetchInbucketMessages = async (localPart: string) => {
  const res = await fetch(`${INBUCKET_BASE}/api/v1/mailbox/${localPart}`);
  if (!res.ok) {
    throw new Error(`Inbucket mailbox fetch failed: ${res.status}`);
  }
  return (await res.json()) as Array<{ id: string; subject: string; from: string }>;
};

const fetchInbucketMessageBody = async (localPart: string, id: string) => {
  const res = await fetch(`${INBUCKET_BASE}/api/v1/mailbox/${localPart}/${id}`);
  if (!res.ok) {
    throw new Error(`Inbucket message fetch failed: ${res.status}`);
  }
  return (await res.json()) as { body: { html?: string; text?: string } };
};

const purgeInbucketMailbox = async (localPart: string) => {
  await fetch(`${INBUCKET_BASE}/api/v1/mailbox/${localPart}`, { method: 'DELETE' }).catch(() => {});
};

test.describe('BizRethink overlay 023 + 021 — Pacta email branding', () => {
  test('forgot-password email contains Pacta-branded footer (not Documenso)', async ({
    request,
  }) => {
    // Seed a user with a deterministic local-part so we can fetch from Inbucket.
    const localPart = `e8-${Date.now()}`;
    const email = `${localPart}@test.documenso.com`;
    await seedUser({ email });
    await purgeInbucketMailbox(localPart);

    // Trigger the forgot-password email.
    const res = await request.post('/api/auth/email-password/forgot-password', {
      data: { email },
      headers: { 'content-type': 'application/json' },
    });
    expect(res.ok()).toBeTruthy();

    // Poll Inbucket for the message (forgot-password queues via background job).
    let messages: Array<{ id: string; subject: string }> = [];
    for (let i = 0; i < 30; i++) {
      messages = await fetchInbucketMessages(localPart);
      if (messages.length > 0) break;
      await new Promise<void>((r) => {
        setTimeout(r, 1000);
      });
    }
    expect(messages.length).toBeGreaterThan(0);

    const body = await fetchInbucketMessageBody(localPart, messages[0].id);
    const html = body.body.html ?? body.body.text ?? '';

    // Pacta branding assertions:
    // - Footer should reference Pacta / BizRethink AI (overlay 023)
    // - Should NOT contain the upstream Documenso footer text
    expect(html).toMatch(/Pacta|BizRethink/i);
    // The Documenso fallback footer mentions "2261 Market Street" — its
    // absence is the regression guard. If this assertion ever flips, overlay
    // 023 has been silently reverted.
    expect(html).not.toContain('2261 Market Street');
  });
});
