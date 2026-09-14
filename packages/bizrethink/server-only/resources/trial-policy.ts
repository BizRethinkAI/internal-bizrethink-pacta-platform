import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';
import { Prisma } from '@prisma/client';
import { DEFAULT_RESOURCE_POLICY, ZResourcePolicy } from '../../resource-policy';

export { DEFAULT_RESOURCE_POLICY, ZResourcePolicy } from '../../resource-policy';

const TRIAL_MS = 14 * 24 * 60 * 60 * 1_000;
const isPaid = (subscription: { status: string } | null) =>
  subscription?.status === 'ACTIVE' || subscription?.status === 'PAST_DUE';
const limitError = (message: string) => new AppError(AppErrorCode.TOO_MANY_REQUESTS, { message, statusCode: 429 });

// No process cache or env fallback. A missing row is a fresh-instance default;
// an unavailable or malformed row is an error, never an unlimited policy.
export const getResourcePolicy = async (tx: Prisma.TransactionClient = prisma) => {
  const row = await tx.bizrethinkInstanceResourcePolicy.findUnique({ where: { id: 'singleton' } });
  return ZResourcePolicy.parse(row ?? DEFAULT_RESOURCE_POLICY);
};

const lockTrialOwner = async (tx: Prisma.TransactionClient, ownerUserId: number) => {
  // Stable transaction-scoped namespace, shared across app instances. No FK or
  // User-row dependency: transferred organisations retain their original budget
  // even if the original account is later deleted.
  await tx.$queryRaw(Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(762011, ${ownerUserId}::integer)`);
};

const getOrCreateBudget = async (tx: Prisma.TransactionClient, ownerUserId: number) => {
  await lockTrialOwner(tx, ownerUserId);
  const existing = await tx.bizrethinkTrialBudget.findUnique({ where: { ownerUserId } });
  if (existing) {
    return existing;
  }

  const organisations = await tx.organisation.findMany({
    where: { ownerUserId },
    include: { subscription: true },
  });
  const billing = await tx.bizrethinkOrganisationBilling.findMany({
    where: { organisationId: { in: organisations.map((org) => org.id) } },
  });
  const external = organisations.filter(
    (org) => !isPaid(org.subscription) && !billing.find((row) => row.organisationId === org.id)?.bizrethinkInternal,
  );
  const organisationIds = external.map((org) => org.id);
  const timestamps = external.flatMap((org) => {
    const row = billing.find((entry) => entry.organisationId === org.id);
    return [org.createdAt.getTime(), ...(row?.trialStartedAt ? [row.trialStartedAt.getTime()] : [])];
  });
  const startedAt = new Date(Math.min(Date.now(), ...timestamps));
  const recordedEnds = billing
    .filter((row) => organisationIds.includes(row.organisationId) && row.trialEndsAt)
    .map((row) => row.trialEndsAt!.getTime());
  const expiresAt = new Date(Math.min(startedAt.getTime() + TRIAL_MS, ...recordedEnds));
  const [stats, storedDocuments] = await Promise.all([
    tx.organisationMonthlyStat.aggregate({
      where: { organisationId: { in: organisationIds } },
      _sum: { documentCount: true, emailCount: true },
    }),
    tx.envelope.count({ where: { team: { organisationId: { in: organisationIds } } } }),
  ]);
  // Import all surviving historical counters conservatively, including a
  // deleted envelope's recorded usage. Deleted pre-control organisations whose
  // cascaded history is already gone cannot be reconstructed by this migration.
  const budget = await tx.bizrethinkTrialBudget.create({
    data: {
      ownerUserId,
      startedAt,
      expiresAt,
      documentsUsed: Math.max(stats._sum.documentCount ?? 0, storedDocuments),
      emailsUsed: stats._sum.emailCount ?? 0,
      organisationsCreated: external.length,
    },
  });
  await tx.bizrethinkTrialOrganisation.createMany({
    data: organisationIds.map((organisationId) => ({ organisationId, ownerUserId })),
    skipDuplicates: true,
  });
  return budget;
};

const getTrialContext = async (tx: Prisma.TransactionClient, organisationId: string) => {
  const organisation = await tx.organisation.findUniqueOrThrow({
    where: { id: organisationId },
    include: { subscription: true },
  });
  const billing = await tx.bizrethinkOrganisationBilling.findUnique({ where: { organisationId } });
  if (billing?.bizrethinkInternal || isPaid(organisation.subscription)) {
    return null;
  }
  const binding = await tx.bizrethinkTrialOrganisation.findUnique({ where: { organisationId } });
  const ownerUserId = binding?.ownerUserId ?? organisation.ownerUserId;
  const budget = await getOrCreateBudget(tx, ownerUserId);
  const policy = await getResourcePolicy(tx);
  return { budget, policy };
};

export const getTrialLimits = async (organisationId: string) =>
  prisma.$transaction(async (tx) => {
    const context = await getTrialContext(tx, organisationId);
    if (!context) {
      return null;
    }
    const { budget, policy } = context;
    const active = budget.expiresAt.getTime() > Date.now();
    return {
      quota: {
        documents: policy.trialDocuments,
        recipients: policy.trialRecipients,
        directTemplates: policy.trialDocuments,
      },
      remaining: {
        documents: active ? Math.max(0, policy.trialDocuments - budget.documentsUsed) : 0,
        recipients: active ? policy.trialRecipients : 0,
        directTemplates: active ? Math.max(0, policy.trialDocuments - budget.documentsUsed) : 0,
      },
      emailsRemaining: active ? Math.max(0, policy.trialEmails - budget.emailsUsed) : 0,
      expiresAt: budget.expiresAt,
    };
  });

export const reserveTrialUsage = async ({
  organisationId,
  type,
  count,
}: {
  organisationId: string;
  type: 'document' | 'email' | 'api';
  count: number;
}) => {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Count must be a non-negative integer' });
  }
  if (count === 0) {
    return;
  }
  await prisma.$transaction(async (tx) => {
    const context = await getTrialContext(tx, organisationId);
    if (!context) {
      return;
    }
    const { budget, policy } = context;
    if (budget.expiresAt.getTime() <= Date.now()) {
      throw limitError(
        'This organisation’s trial has ended. A paid subscription is required to create documents or send emails.',
      );
    }
    if (type === 'api') {
      // API traffic is finite even when a cloned claim has an empty rate array.
      const key = `trial-api:${budget.ownerUserId}`;
      const bucket = new Date(Math.floor(Date.now() / 60_000) * 60_000);
      const action = 'external-trial-api';
      const rate = await tx.rateLimit.upsert({
        where: { key_action_bucket: { key, action, bucket } },
        create: { key, action, bucket, count },
        update: { count: { increment: count } },
      });
      if (rate.count > 100) {
        throw limitError('Trial API request limit reached. Try again in a minute.');
      }
      return;
    }
    const column = type === 'document' ? 'documentsUsed' : 'emailsUsed';
    const cap = type === 'document' ? policy.trialDocuments : policy.trialEmails;
    if (budget[column] + count > cap) {
      throw limitError(
        `This trial’s ${type === 'document' ? 'document' : 'recipient email'} allowance has been reached.`,
      );
    }
    await tx.bizrethinkTrialBudget.update({
      where: { ownerUserId: budget.ownerUserId },
      data: { [column]: { increment: count } },
    });
  });
};

// Called INSIDE the organisation constructor's existing transaction. Its
// caller cannot commit an organisation without the durable entitlement row.
export const prepareTrialOrganisation = async (
  tx: Prisma.TransactionClient,
  ownerUserId: number,
  pendingCheckout = false,
) => {
  const budget = await getOrCreateBudget(tx, ownerUserId);
  const policy = await getResourcePolicy(tx);
  if (pendingCheckout) {
    const pending = await tx.organisation.findFirst({
      where: {
        ownerUserId,
        type: 'ORGANISATION',
        OR: [{ subscription: { is: null } }, { subscription: { status: 'INACTIVE' } }],
      },
    });
    if (pending) {
      throw limitError('Complete or remove the existing organisation awaiting payment first.');
    }
  } else if (budget.organisationsCreated >= policy.trialOrganisations || budget.expiresAt.getTime() <= Date.now()) {
    throw limitError('This account’s trial organisation allowance has been reached.');
  }
  return budget;
};

export const recordTrialOrganisation = async (
  tx: Prisma.TransactionClient,
  organisationId: string,
  budget: Awaited<ReturnType<typeof prepareTrialOrganisation>>,
) => {
  await tx.bizrethinkTrialOrganisation.create({ data: { organisationId, ownerUserId: budget.ownerUserId } });
  await tx.bizrethinkTrialBudget.update({
    where: { ownerUserId: budget.ownerUserId },
    data: { organisationsCreated: { increment: 1 } },
  });
  await tx.bizrethinkOrganisationBilling.upsert({
    where: { organisationId },
    create: {
      organisationId,
      bizrethinkInternal: false,
      trialStartedAt: budget.startedAt,
      trialEndsAt: budget.expiresAt,
    },
    update: {},
  });
};

/** Caller has already resolved an authorized team/envelope. */
export const assertTrialDistribution = async (teamId: number, recipients: number, userId: number) => {
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: { organisationId: true } });
  const trial = await getTrialLimits(team.organisationId);
  if (!trial) {
    return;
  }
  const sender = await prisma.user.findFirst({
    where: { id: userId, disabled: false },
    select: { emailVerified: true },
  });
  if (!sender?.emailVerified) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, {
      message: 'Verify your account email before sending trial documents.',
    });
  }
  if (trial.expiresAt.getTime() <= Date.now()) {
    throw limitError('This organisation’s trial has ended.');
  }
  if (recipients > trial.quota.recipients) {
    throw new AppError('RECIPIENT_LIMIT_EXCEEDED', {
      statusCode: 400,
      message: `This trial permits at most ${trial.quota.recipients} recipients per document.`,
    });
  }
};

export const reserveTrialRecipientEmail = async (teamId: number) => {
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: { organisationId: true } });
  await reserveTrialUsage({ organisationId: team.organisationId, type: 'email', count: 1 });
};
