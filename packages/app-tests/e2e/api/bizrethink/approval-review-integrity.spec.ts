/** A-18/A-22: actual HTTP authorization and PostgreSQL concurrency in isolated CI. */
import { randomUUID } from 'node:crypto';
import { clauseFingerprint } from '@bizrethink/customizations/lease/clauses/approval';
import { ALL_CLAUSES } from '@bizrethink/customizations/lease/clauses/library';
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { prisma } from '@documenso/prisma';
import { seedUser } from '@documenso/prisma/seed/users';
import { type APIRequestContext, type APIResponse, expect, test } from '@playwright/test';
import { type Prisma, Role } from '@prisma/client';

const baseURL = NEXT_PUBLIC_WEBAPP_URL();
const call = (request: APIRequestContext, name: string, input: Record<string, unknown>, mutation = true) => {
  const headers = { 'content-type': 'application/json' };
  const data = JSON.stringify({ json: input });
  const url = `${baseURL}/api/trpc/bizrethink.leaseBuilder.${name}`;
  return mutation
    ? request.post(url, { headers, data })
    : request.get(`${url}?input=${encodeURIComponent(data)}`, { headers });
};
const signIn = async (request: APIRequestContext, email: string) => {
  const { csrfToken } = await (await request.get(`${baseURL}/api/auth/csrf`)).json();
  const response = await request.post(`${baseURL}/api/auth/email-password/authorize`, {
    data: { email, password: 'password', csrfToken },
  });
  expect(response.status(), await response.text()).toBe(201);
};
const ok = async (response: APIResponse) => {
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()).result.data.json;
};
const denied = async (response: APIResponse, status: number, code: string) => {
  expect(response.status(), await response.text()).toBe(status);
  expect((await response.json()).error.json.data.code).toBe(code);
};
const grantLease = (organisationId: string) =>
  prisma.bizrethinkFeatureAccess.create({
    data: { id: randomUUID(), feature: 'lease-builder', scope: 'organisation', scopeId: organisationId, enabled: true },
  });

test('A-18 only an instance admin can resolve global findings and approve a lease clause', async ({ request }) => {
  const owner = await seedUser();
  const foreign = await seedUser();
  const grant = await grantLease(owner.organisation.id);
  const clause = ALL_CLAUSES.filter((candidate) => candidate.jurisdiction === 'US-FL').at(-1)!;
  const share = await prisma.bizrethinkLibraryReview.create({
    data: {
      id: randomUUID(),
      token: randomUUID(),
      organisationId: foreign.organisation.id,
      reviewerName: 'Synthetic counsel',
      reviewerEmail: 'counsel@example.test',
      jurisdiction: 'US-FL',
      libraryFingerprint: 'synthetic',
      createdByUserId: foreign.user.id,
    },
  });
  const finding = await prisma.bizrethinkLibraryFinding.create({
    data: {
      id: randomUUID(),
      reviewId: share.id,
      clauseSlug: clause.slug,
      body: 'Synthetic global blocker',
      authorName: share.reviewerName,
      authorEmail: share.reviewerEmail,
      clauseFingerprint: clauseFingerprint(clause),
    },
  });
  const prior = await prisma.bizrethinkClauseApproval.create({
    data: {
      id: randomUUID(),
      clauseSlug: clause.slug,
      clauseVersion: clause.version,
      fingerprint: clauseFingerprint(clause),
      approvedByName: 'Synthetic prior reviewer',
      approvedByUserId: owner.user.id,
      clauseJurisdiction: clause.jurisdiction,
      barJurisdiction: 'US-FL',
    },
  });
  const input = {
    organisationId: owner.organisation.id,
    clauseSlug: clause.slug,
    fingerprint: clauseFingerprint(clause),
    approvedByName: 'Synthetic current reviewer',
    barJurisdiction: 'US-FL',
  };
  try {
    await denied(await call(request, 'clauseLibrary.approve', input), 401, 'UNAUTHORIZED');
    await signIn(request, owner.user.email);
    await denied(await call(request, 'clauseLibrary.approve', input), 401, 'UNAUTHORIZED');
    await denied(
      await call(request, 'clauseLibrary.listFindings', { organisationId: input.organisationId }, false),
      401,
      'UNAUTHORIZED',
    );
    await denied(
      await call(request, 'clauseLibrary.answerFinding', {
        organisationId: input.organisationId,
        findingId: finding.id,
        answer: 'Attempted bypass',
      }),
      401,
      'UNAUTHORIZED',
    );
    expect(
      (await prisma.bizrethinkClauseApproval.findUniqueOrThrow({ where: { id: prior.id } })).supersededAt,
    ).toBeNull();

    await prisma.user.update({ where: { id: owner.user.id }, data: { roles: [Role.ADMIN, Role.USER] } });
    await denied(await call(request, 'clauseLibrary.approve', input), 400, 'INVALID_REQUEST');
    const findings = await ok(
      await call(request, 'clauseLibrary.listFindings', { organisationId: input.organisationId }, false),
    );
    expect(findings).toEqual(expect.arrayContaining([expect.objectContaining({ id: finding.id })]));
    await ok(
      await call(request, 'clauseLibrary.answerFinding', {
        organisationId: input.organisationId,
        findingId: finding.id,
        answer: 'Synthetic resolution recorded.',
      }),
    );
    await ok(await call(request, 'clauseLibrary.approve', input));
    expect(
      (await prisma.bizrethinkClauseApproval.findUniqueOrThrow({ where: { id: prior.id } })).supersededAt,
    ).not.toBeNull();
    const current = await prisma.bizrethinkClauseApproval.findFirstOrThrow({
      where: { clauseSlug: clause.slug, supersededAt: null, approvedByUserId: owner.user.id },
    });
    expect(current.fingerprint).toBe(input.fingerprint);
    expect(current.approvedByName).toBe(input.approvedByName);
    // The existing counsel token remains scoped to its own review.
    const counsel = await ok(await call(request, 'clauseLibrary.openFindings', { token: share.token }, false));
    expect(counsel.findings).toEqual([
      expect.objectContaining({ id: finding.id, answer: 'Synthetic resolution recorded.' }),
    ]);
  } finally {
    await prisma.bizrethinkClauseApproval.deleteMany({
      where: { approvedByUserId: owner.user.id, clauseSlug: clause.slug },
    });
    await prisma.bizrethinkLibraryReview.delete({ where: { id: share.id } });
    await prisma.bizrethinkFeatureAccess.delete({ where: { id: grant.id } });
  }
});

const seedReview = async () => {
  const owner = await seedUser();
  await grantLease(owner.organisation.id);
  const matter = await prisma.bizrethinkLeaseMatter.create({
    data: {
      id: randomUUID(),
      organisationId: owner.organisation.id,
      teamId: owner.team.id,
      createdByUserId: owner.user.id,
      propertyId: randomUUID(),
      title: 'Synthetic review matter',
      facts: {},
      money: {},
      values: { authorisedOccupants: 'Before', permittedPets: 'Before', landlord: 'Owner' },
      delegatedFields: ['authorisedOccupants', 'permittedPets'],
    },
  });
  const review = await prisma.bizrethinkLeaseReview.create({
    data: {
      id: randomUUID(),
      token: randomUUID(),
      matterId: matter.id,
      audience: 'tenant',
      reviewerName: 'Synthetic tenant',
      reviewerEmail: 'tenant@example.test',
      answersHash: 'synthetic',
      createdByUserId: owner.user.id,
      expiresAt: new Date(Date.now() + 600_000),
    },
  });
  return { owner, matter, review };
};
const submit = (request: APIRequestContext, token: string, value: string, field = 'authorisedOccupants') =>
  call(request, 'review.submit', {
    token,
    comments: [{ clauseSlug: null, body: value }],
    answers: { [field]: value, monthlyRentUsd: 1, landlord: 'Untrusted' },
  });
const commentsFor = (reviewId: string) => prisma.bizrethinkReviewComment.findMany({ where: { reviewId } });

test('A-22 one of three concurrent HTTP submissions wins and owns both answers and comments', async ({ request }) => {
  const { matter, review } = await seedReview();
  const values = ['Submission A', 'Submission B', 'Submission C'];
  const responses = await Promise.all(values.map((value) => submit(request, review.token, value)));
  expect(responses.map((response) => response.status()).sort()).toEqual([200, 404, 404]);
  for (const response of responses.filter((response) => response.status() !== 200)) {
    await denied(response, 404, 'NOT_FOUND');
  }
  const winner = values[responses.findIndex((response) => response.status() === 200)];
  expect((await prisma.bizrethinkLeaseMatter.findUniqueOrThrow({ where: { id: matter.id } })).values).toEqual({
    authorisedOccupants: winner,
    permittedPets: 'Before',
    landlord: 'Owner',
  });
  expect(await commentsFor(review.id)).toEqual([
    expect.objectContaining({ body: winner, authorName: review.reviewerName }),
  ]);
  expect((await prisma.bizrethinkLeaseReview.findUniqueOrThrow({ where: { id: review.id } })).status).toBe('returned');
  await denied(await submit(request, review.token, 'Replay'), 404, 'NOT_FOUND');
  expect(await commentsFor(review.id)).toHaveLength(1);
});

// Hold a real row lock, start an HTTP request, and wait until PostgreSQL
// confirms it is blocked by this transaction. No sleeps or timing guesses.
const whileBlocked = async (
  lock: (tx: Prisma.TransactionClient) => Promise<unknown>,
  start: () => Promise<APIResponse>,
  change: (tx: Prisma.TransactionClient) => Promise<unknown>,
) => {
  let response: Promise<APIResponse> | undefined;
  await prisma.$transaction(
    async (tx) => {
      await lock(tx);
      const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      response = start();
      await expect
        .poll(
          async () => {
            const [{ waiting }] = await prisma.$queryRaw<Array<{ waiting: number }>>`
        SELECT count(*)::int AS waiting FROM pg_stat_activity
        WHERE ${pid} = ANY(pg_blocking_pids(pid))`;
            return waiting;
          },
          { timeout: 5000 },
        )
        .toBeGreaterThan(0);
      await change(tx);
    },
    { timeout: 10000 },
  );
  if (!response) {
    throw new Error('The HTTP request was not started.');
  }
  return response;
};

test('A-22 revocation winning a database lock race prevents every in-flight submit effect', async ({ request }) => {
  const { matter, review } = await seedReview();
  const response = await whileBlocked(
    (tx) => tx.$queryRaw`SELECT id FROM "BizrethinkLeaseReview" WHERE id = ${review.id} FOR UPDATE`,
    () => submit(request, review.token, 'Losing submission'),
    (tx) => tx.bizrethinkLeaseReview.update({ where: { id: review.id }, data: { status: 'closed' } }),
  );
  await denied(response, 404, 'NOT_FOUND');
  expect(await commentsFor(review.id)).toEqual([]);
  expect((await prisma.bizrethinkLeaseMatter.findUniqueOrThrow({ where: { id: matter.id } })).values).toEqual(
    matter.values,
  );
  expect((await prisma.bizrethinkLeaseReview.findUniqueOrThrow({ where: { id: review.id } })).status).toBe('closed');
});

test('A-22 a matter frozen while submission waits rolls back the review claim and comments', async ({ request }) => {
  const { matter, review } = await seedReview();
  const response = await whileBlocked(
    (tx) => tx.$queryRaw`SELECT id FROM "BizrethinkLeaseMatter" WHERE id = ${matter.id} FOR UPDATE`,
    () => submit(request, review.token, 'Too late'),
    (tx) =>
      tx.bizrethinkLeaseMatter.update({
        where: { id: matter.id },
        data: { status: 'sent', envelopeId: 'synthetic-envelope' },
      }),
  );
  await denied(response, 404, 'NOT_FOUND');
  expect(await commentsFor(review.id)).toEqual([]);
  expect((await prisma.bizrethinkLeaseReview.findUniqueOrThrow({ where: { id: review.id } })).status).toBe('open');
  expect((await prisma.bizrethinkLeaseMatter.findUniqueOrThrow({ where: { id: matter.id } })).values).toEqual(
    matter.values,
  );
});

test('A-22 separate review links merge their delegated answers without losing the other return', async ({
  request,
}) => {
  const { matter, review } = await seedReview();
  const second = await prisma.bizrethinkLeaseReview.create({
    data: { ...review, id: randomUUID(), token: randomUUID() },
  });
  await Promise.all([
    submit(request, review.token, 'Occupants returned').then(ok),
    submit(request, second.token, 'Pets returned', 'permittedPets').then(ok),
  ]);
  expect((await prisma.bizrethinkLeaseMatter.findUniqueOrThrow({ where: { id: matter.id } })).values).toEqual({
    authorisedOccupants: 'Occupants returned',
    permittedPets: 'Pets returned',
    landlord: 'Owner',
  });
  expect(await commentsFor(review.id)).toHaveLength(1);
  expect(await commentsFor(second.id)).toHaveLength(1);
});

test('A-22 a racing HTTP revoke cannot hide a successfully returned review', async ({ request }) => {
  const { owner, matter, review } = await seedReview();
  await signIn(request, owner.user.email);
  const [submission, revocation] = await Promise.all([
    submit(request, review.token, 'Returned comments'),
    call(request, 'review.revoke', { matterId: matter.id, reviewId: review.id }),
  ]);
  const after = await prisma.bizrethinkLeaseReview.findUniqueOrThrow({ where: { id: review.id } });
  if (submission.status() === 200) {
    await denied(revocation, 400, 'INVALID_REQUEST');
    expect(after.status).toBe('returned');
    expect(await commentsFor(review.id)).toHaveLength(1);
  } else {
    await denied(submission, 404, 'NOT_FOUND');
    await ok(revocation);
    expect(after.status).toBe('closed');
    expect(await commentsFor(review.id)).toEqual([]);
  }
});
