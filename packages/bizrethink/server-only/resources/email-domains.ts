import { generateKeyPair } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import { promisify } from 'node:util';
import { DOCUMENSO_ENCRYPTION_KEY } from '@documenso/lib/constants/crypto';
import { ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP } from '@documenso/lib/constants/organisations';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { symmetricEncrypt } from '@documenso/lib/universal/crypto';
import { generateDatabaseId } from '@documenso/lib/universal/id';
import { generateEmailDomainRecords } from '@documenso/lib/utils/email-domains';
import { buildOrganisationWhereQuery } from '@documenso/lib/utils/organisations';
import { prisma } from '@documenso/prisma';
import { type BizrethinkEmailDomainChallenge, type EmailDomain, EmailDomainStatus, Prisma } from '@prisma/client';
import { withResourceSlot } from './admission';

const DAY = 24 * 60 * 60 * 1000;
const flattenKey = (key: string) => key.trim().split('\n').slice(1, -1).join('');
const canonical = (domain: string) => domain.toLowerCase().replace(/\.$/, '');
const conflict = () =>
  new AppError(AppErrorCode.ALREADY_EXISTS, { message: 'This domain already has a verified owner.' });
const expired = () =>
  new AppError(AppErrorCode.EXPIRED_CODE, {
    message: 'This domain verification request expired. Remove it and create a new request.',
  });
const lockDomain = (tx: Prisma.TransactionClient, domain: string) =>
  tx.$queryRaw(Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(762013, hashtext(${canonical(domain)}))`);
const knownOwner = async (tx: Prisma.TransactionClient, row: EmailDomain & { emails?: unknown[] }) =>
  row.status === 'ACTIVE' ||
  Boolean(row.emails?.length) ||
  Boolean(await tx.bizrethinkEmailDomainOwnership.findUnique({ where: { emailDomainId: row.id } }));
const rememberOwner = (tx: Prisma.TransactionClient, id: string) =>
  tx.bizrethinkEmailDomainOwnership.upsert({ where: { emailDomainId: id }, create: { emailDomainId: id }, update: {} });
const challengeView = (row: BizrethinkEmailDomainChallenge) => {
  const { privateKey: _privateKey, ownerUserId: _ownerUserId, ...safe } = row;
  return { ...safe, status: EmailDomainStatus.PENDING, emails: [] };
};
const reserveAttempt = async (tx: Prisma.TransactionClient, key: string, action: string, cap: number) => {
  const bucket = new Date();
  bucket.setUTCMinutes(0, 0, 0);
  const row = await tx.rateLimit.upsert({
    where: { key_action_bucket: { key, action, bucket } },
    create: { key, action, bucket, count: 1 },
    update: { count: { increment: 1 } },
  });
  if (row.count > cap) {
    throw new AppError(AppErrorCode.TOO_MANY_REQUESTS, { statusCode: 429 });
  }
};

export const createDomainChallenge = async ({
  domain: raw,
  organisationId,
}: {
  domain: string;
  organisationId: string;
}) => {
  const domain = canonical(raw);
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Enter a valid public email domain.' });
  }
  if (!DOCUMENSO_ENCRYPTION_KEY) {
    throw new AppError(AppErrorCode.NOT_SETUP);
  }
  const organisation = await prisma.organisation.findUniqueOrThrow({
    where: { id: organisationId },
    select: { ownerUserId: true },
  });
  return withResourceSlot('domain-key-generation', 2, () =>
    prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(762014, ${organisation.ownerUserId}::integer)`,
      );
      const existing = await tx.emailDomain.findFirst({
        where: {
          OR: [
            { domain: { equals: domain, mode: 'insensitive' } },
            { domain: { equals: domain + '.', mode: 'insensitive' } },
          ],
        },
        include: { emails: true },
      });
      if (existing && (await knownOwner(tx, existing))) {
        throw conflict();
      }
      const now = new Date();
      const prior = await tx.bizrethinkEmailDomainChallenge.findUnique({
        where: { organisationId_domain: { organisationId, domain } },
      });
      if (prior && prior.expiresAt > now) {
        return {
          emailDomain: challengeView(prior),
          records: generateEmailDomainRecords(prior.selector.split('._domainkey.')[0] + '._domainkey', prior.publicKey),
        };
      }
      await tx.bizrethinkEmailDomainChallenge.deleteMany({
        where: { expiresAt: { lte: now }, OR: [{ ownerUserId: organisation.ownerUserId }, { organisationId, domain }] },
      });
      const [ownerCount, orgCount] = await Promise.all([
        tx.bizrethinkEmailDomainChallenge.count({
          where: { ownerUserId: organisation.ownerUserId, expiresAt: { gt: now } },
        }),
        tx.bizrethinkEmailDomainChallenge.count({ where: { organisationId, expiresAt: { gt: now } } }),
      ]);
      if (ownerCount >= 20 || orgCount >= 5) {
        throw new AppError(AppErrorCode.TOO_MANY_REQUESTS, { statusCode: 429 });
      }
      await reserveAttempt(tx, `domain-owner:${organisation.ownerUserId}`, 'domain-create', 60);
      const id = generateDatabaseId('email_domain');
      const selector = `documenso-${id}`.replace(/[_.]/g, '-');
      const keys = await promisify(generateKeyPair)('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      const publicKey = flattenKey(keys.publicKey);
      const row = await tx.bizrethinkEmailDomainChallenge.create({
        data: {
          id,
          domain,
          organisationId,
          ownerUserId: organisation.ownerUserId,
          selector: `${selector}._domainkey.${domain}`,
          publicKey,
          privateKey: symmetricEncrypt({ key: DOCUMENSO_ENCRYPTION_KEY, data: flattenKey(keys.privateKey) }),
          expiresAt: new Date(now.getTime() + DAY),
        },
      });
      return {
        emailDomain: challengeView(row),
        records: generateEmailDomainRecords(`${selector}._domainkey`, publicKey),
      };
    }),
  );
};

export const getDomainChallenge = async (id: string, userId?: number) => {
  const row = await prisma.bizrethinkEmailDomainChallenge.findUnique({ where: { id } });
  if (!row) {
    return null;
  }
  const organisation = await prisma.organisation.findFirst({
    where:
      userId === undefined
        ? { id: row.organisationId }
        : buildOrganisationWhereQuery({
            organisationId: row.organisationId,
            userId,
            roles: ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP.MANAGE_ORGANISATION,
          }),
    select: { id: true, name: true, url: true },
  });
  if (!organisation) {
    throw new AppError(AppErrorCode.NOT_FOUND);
  }
  return { ...challengeView(row), organisation };
};

export const verifyDomainProof = async (id: string) => {
  const challenge = await prisma.bizrethinkEmailDomainChallenge.findUnique({ where: { id } });
  const row = challenge ?? (await prisma.emailDomain.findUnique({ where: { id }, include: { emails: true } }));
  if (!row) {
    throw new AppError(AppErrorCode.NOT_FOUND);
  }
  if (challenge && challenge.expiresAt.getTime() <= Date.now()) {
    throw expired();
  }
  await prisma.$transaction((tx) => reserveAttempt(tx, `domain-org:${row.organisationId}`, 'domain-verify', 120));
  let isVerified = false;
  const resolver = new Resolver({ timeout: 3000, tries: 2 });
  resolver.setServers(['1.1.1.1', '8.8.8.8']);
  try {
    const records = await resolver.resolveTxt(row.selector);
    isVerified = records.some((chunks) => {
      const record = chunks.join('');
      return (
        record.length <= 4096 &&
        /^v=DKIM1(?:;|\s)/.test(record) &&
        record.match(/(?:^|;)\s*p=([A-Za-z0-9+/=]+)(?:;|\s|$)/)?.[1] === row.publicKey
      );
    });
  } catch {
    isVerified = false;
  } finally {
    resolver.cancel();
  }

  const emailDomain = await prisma.$transaction(async (tx) => {
    await lockDomain(tx, row.domain);
    if (challenge) {
      const current = await tx.bizrethinkEmailDomainChallenge.findUnique({ where: { id } });
      if (
        !current ||
        current.expiresAt.getTime() <= Date.now() ||
        current.publicKey !== row.publicKey ||
        current.organisationId !== row.organisationId
      ) {
        throw expired();
      }
      // A deleted organisation must not regain ownership through an orphaned challenge.
      await tx.organisation.findUniqueOrThrow({ where: { id: current.organisationId }, select: { id: true } });
      if (!isVerified) {
        return challengeView(
          await tx.bizrethinkEmailDomainChallenge.update({ where: { id }, data: { lastVerifiedAt: new Date() } }),
        );
      }
      const existing = await tx.emailDomain.findFirst({
        where: {
          OR: [
            { domain: { equals: canonical(row.domain), mode: 'insensitive' } },
            { domain: { equals: canonical(row.domain) + '.', mode: 'insensitive' } },
          ],
        },
        include: { emails: true },
      });
      if (existing) {
        if (await knownOwner(tx, existing)) {
          throw conflict();
        }
        await tx.emailDomain.delete({ where: { id: existing.id } });
      }
      await tx.$queryRaw(
        Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(762014, ${current.ownerUserId}::integer)`,
      );
      if ((await tx.emailDomain.count({ where: { organisationId: current.organisationId } })) >= 100) {
        throw new AppError(AppErrorCode.LIMIT_EXCEEDED, {
          message: 'This organisation has reached its email-domain limit.',
        });
      }
      const created = await tx.emailDomain.create({
        data: {
          id,
          domain: canonical(current.domain),
          organisationId: current.organisationId,
          selector: current.selector,
          publicKey: current.publicKey,
          privateKey: current.privateKey,
          status: 'ACTIVE',
          lastVerifiedAt: new Date(),
        },
        omit: { privateKey: true },
        include: { emails: true },
      });
      await rememberOwner(tx, id);
      await tx.bizrethinkEmailDomainChallenge.delete({ where: { id } });
      return created;
    }
    const current = await tx.emailDomain.findUnique({ where: { id }, include: { emails: true } });
    if (!current || current.publicKey !== row.publicKey || current.organisationId !== row.organisationId) {
      throw new AppError(AppErrorCode.NOT_FOUND);
    }
    if (await knownOwner(tx, current)) {
      await rememberOwner(tx, id);
    } else if (current.createdAt.getTime() + DAY <= Date.now()) {
      throw expired();
    }
    if (isVerified) {
      await rememberOwner(tx, id);
    }
    return tx.emailDomain.update({
      where: { id },
      data: { status: isVerified ? 'ACTIVE' : 'PENDING', lastVerifiedAt: new Date() },
      omit: { privateKey: true },
      include: { emails: true },
    });
  });
  return { emailDomain, isVerified };
};

export const deleteDomainChallenge = async (id: string) =>
  prisma.$transaction(async (tx) => {
    const row = await tx.bizrethinkEmailDomainChallenge.findUnique({ where: { id } });
    if (!row) {
      return false;
    }
    await lockDomain(tx, row.domain);
    return (await tx.bizrethinkEmailDomainChallenge.deleteMany({ where: { id } })).count > 0;
  });

export const preserveDomainOwnership = async (id: string) =>
  prisma.$transaction(async (tx) => {
    const row = await tx.emailDomain.findUnique({ where: { id }, include: { emails: true } });
    if (!row) {
      throw new AppError(AppErrorCode.NOT_FOUND);
    }
    await lockDomain(tx, row.domain);
    if (await knownOwner(tx, row)) {
      await rememberOwner(tx, id);
    }
  });

type DomainListRow = Pick<
  EmailDomain,
  'id' | 'domain' | 'status' | 'selector' | 'organisationId' | 'createdAt' | 'updatedAt' | 'lastVerifiedAt'
> & {
  expiresAt: Date | null;
  organisation: { id: string; name: string; url: string };
  emailCount: number;
  _count: { emails: number };
};
/** SQL union keeps pagination bounded without fetching either complete table. */
export const findDomainRecords = async ({
  organisationId,
  emailDomainId,
  query,
  statuses = [],
  page = 1,
  perPage = 20,
}: {
  organisationId?: string;
  emailDomainId?: string;
  query?: string;
  statuses?: EmailDomainStatus[];
  page?: number;
  perPage?: number;
}) => {
  const currentPage = Math.max(1, page);
  const take = Math.max(1, Math.min(100, perPage));
  const criteria = [Prisma.sql`TRUE`];
  if (organisationId) {
    criteria.push(Prisma.sql`d."organisationId" = ${organisationId}`);
  }
  if (emailDomainId) {
    criteria.push(Prisma.sql`d.id = ${emailDomainId}`);
  }
  if (query) {
    criteria.push(Prisma.sql`(d.domain ILIKE ${`%${query}%`} OR o.name ILIKE ${`%${query}%`})`);
  }
  if (statuses.length) {
    criteria.push(Prisma.sql`d.status IN (${Prisma.join(statuses)})`);
  }
  const source = Prisma.sql`WITH domains AS (
    SELECT id, domain, status::text, selector, "organisationId", "createdAt", "updatedAt", "lastVerifiedAt", NULL::timestamp AS "expiresAt" FROM "EmailDomain"
    UNION ALL
    SELECT id, domain, 'PENDING'::text, selector, "organisationId", "createdAt", "updatedAt", "lastVerifiedAt", "expiresAt" FROM "BizrethinkEmailDomainChallenge"
  )`;
  const from = Prisma.sql`FROM domains d JOIN "Organisation" o ON o.id = d."organisationId" WHERE ${Prisma.join(criteria, ' AND ')}`;
  const [data, counts] = await Promise.all([
    prisma.$queryRaw<
      DomainListRow[]
    >(Prisma.sql`${source} SELECT d.*, json_build_object('id', o.id, 'name', o.name, 'url', o.url) AS organisation,
      (SELECT COUNT(*)::int FROM "OrganisationEmail" e WHERE e."emailDomainId" = d.id) AS "emailCount"
      ${from} ORDER BY d."createdAt" DESC, d.id DESC LIMIT ${take} OFFSET ${(currentPage - 1) * take}`),
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`${source} SELECT COUNT(*) AS count ${from}`),
  ]);
  const count = Number(counts[0].count);
  return {
    data: data.map((row) => ({ ...row, _count: { emails: row.emailCount } })),
    count,
    currentPage,
    perPage: take,
    totalPages: Math.ceil(count / take),
  };
};

export const findVerifiableDomains = async (organisationId: string, emailDomainId?: string) => {
  const result = await findDomainRecords({ organisationId, emailDomainId, perPage: 100 });
  return result.data.filter((row) => emailDomainId || !row.expiresAt || row.expiresAt.getTime() > Date.now());
};
