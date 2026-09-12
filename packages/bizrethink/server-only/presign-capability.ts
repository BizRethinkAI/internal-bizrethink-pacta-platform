import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { getTeamById } from '@documenso/lib/server-only/team/get-team';
import type { EnvelopeIdOptions } from '@documenso/lib/utils/envelope';
import { unsafeBuildEnvelopeIdQuery } from '@documenso/lib/utils/envelope';
import { prisma } from '@documenso/prisma';
import type { Prisma } from '@prisma/client';
import { decodeJwt, jwtVerify } from 'jose';
import { z } from 'zod';

export type VerifiedPresignCapability = {
  id: number;
  userId: number;
  teamId: number;
  user: { id: number; name: string | null; email: string };
  /** null is the documented team-wide authoring capability. */
  scope: EnvelopeIdOptions | null;
};
export type VerifyPresignCapabilityOptions = {
  token: string;
  scope?: string;
  /** Omitted only for verification/authoring context, never a mutation. */
  operation?: 'create' | 'update';
};
const unavailable = () => new AppError(AppErrorCode.UNAUTHORIZED, { message: 'Invalid or unavailable presign token' });
const ZPositiveId = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .refine(Number.isSafeInteger);
const parseScope = (scope: unknown): EnvelopeIdOptions | null => {
  if (scope === undefined) {
    return null;
  }
  const value = z.string().min(1).safeParse(scope);
  if (!value.success) {
    throw unavailable();
  }
  const [type, id, extra] = value.data.split(':');
  if (extra !== undefined || !id) {
    throw unavailable();
  }
  if (type === 'envelopeId' && /^envelope_[A-Za-z0-9_-]+$/.test(id)) {
    return { type, id };
  }
  const numeric = ZPositiveId.safeParse(id);
  if ((type === 'documentId' || type === 'templateId') && numeric.success) {
    return { type, id: numeric.data };
  }
  throw unavailable();
};

/** Verify the signed delegation, retaining authority rather than only its creator. */
export const verifyPresignCapability = async ({
  token,
  scope,
  operation,
}: VerifyPresignCapabilityOptions): Promise<VerifiedPresignCapability> => {
  // The unverified subject selects a candidate key only. No claim authorizes
  // anything until signature, algorithm and expiry have all been verified.
  let tokenId: number;
  try {
    tokenId = ZPositiveId.parse(decodeJwt(token).sub);
  } catch {
    throw unavailable();
  }
  const parent = await prisma.apiToken.findFirst({
    where: { id: tokenId },
    include: {
      user: { select: { id: true, name: true, email: true, disabled: true } },
      team: { select: { organisation: { select: { owner: { select: { disabled: true } } } } } },
    },
  });
  if (
    !parent ||
    !parent.userId ||
    !parent.user ||
    parent.user.disabled !== false ||
    parent.team.organisation.owner.disabled !== false ||
    (parent.expires !== null && parent.expires.getTime() <= Date.now()) ||
    !Number.isSafeInteger(parent.teamId) ||
    parent.teamId <= 0
  ) {
    throw unavailable();
  }
  let capabilityScope: EnvelopeIdOptions | null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(parent.token), {
      algorithms: ['HS256'],
      requiredClaims: ['sub', 'aud', 'exp'],
    });
    const audience = ZPositiveId.parse(payload.aud);
    if (audience !== parent.teamId && audience !== parent.userId) {
      throw unavailable();
    }
    capabilityScope = parseScope(payload.scope);
  } catch {
    throw unavailable();
  }
  // Revocation by membership removal applies even though the parent row remains.
  const team = await getTeamById({ userId: parent.userId, teamId: parent.teamId }).catch(() => null);
  if (!team || team.id !== parent.teamId) {
    throw unavailable();
  }
  const capability: VerifiedPresignCapability = {
    id: parent.id,
    userId: parent.userId,
    teamId: parent.teamId,
    user: { id: parent.user.id, name: parent.user.name, email: parent.user.email },
    scope: capabilityScope,
  };
  return await authorizePresignOperation(capability, { scope, operation });
};

/** Accept only a server-verified capability; resource operations never turn it into user-wide authority. */
export const authorizePresignOperation = async (
  capability: VerifiedPresignCapability,
  { scope, operation }: Pick<VerifyPresignCapabilityOptions, 'scope' | 'operation'>,
) => {
  const expectedScope = parseScope(scope);
  if (
    expectedScope &&
    capability.scope &&
    (expectedScope.type !== capability.scope.type || expectedScope.id !== capability.scope.id)
  ) {
    throw unavailable();
  }
  if (operation === 'create' && capability.scope) {
    throw unavailable();
  }
  if (operation === 'update') {
    if (!expectedScope) {
      throw unavailable();
    }
    await assertPresignResource(capability, expectedScope);
  }
  return capability;
};

/** Narrow metadata lookup before a consumer can load a PDF or mutate a target. */
export const assertPresignResource = async (capability: VerifiedPresignCapability, target: EnvelopeIdOptions) => {
  const resource = await prisma.envelope.findFirst({
    where: {
      AND: [unsafeBuildEnvelopeIdQuery(target, null), getPresignEnvelopeWhere(capability)],
    },
    select: { id: true },
  });
  if (!resource) {
    throw unavailable();
  }
};

/** Apply this to the data-bearing query too; an earlier check is not a data snapshot. */
export const getPresignEnvelopeWhere = (capability: VerifiedPresignCapability): Prisma.EnvelopeWhereInput => ({
  AND: [
    { teamId: capability.teamId },
    ...(capability.scope ? [unsafeBuildEnvelopeIdQuery(capability.scope, null)] : []),
  ],
});
