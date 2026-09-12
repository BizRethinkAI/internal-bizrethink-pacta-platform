import { hashString } from '@documenso/lib/server-only/auth/hash';
import { logger } from '@documenso/lib/utils/logger';
import { DocumentStatus, TeamMemberRole } from '@prisma/client';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadRoute } from '../../../apps/remix/server/api/download/download';
import type { HonoEnv } from '../../../apps/remix/server/router';
import { envelopeFixture, matchesQuery } from './api-token-team-fixture';

const { db, getTeam, auditPdf, certificatePdf, fileResponse } = vi.hoisted(() => ({
  db: { apiToken: { findFirst: vi.fn(), updateMany: vi.fn() }, envelope: { findFirst: vi.fn() } },
  getTeam: vi.fn(),
  auditPdf: vi.fn(),
  certificatePdf: vi.fn(),
  fileResponse: vi.fn(),
}));

vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/server-only/team/get-team', () => ({ getTeamById: getTeam }));
vi.mock('@documenso/lib/server-only/rate-limit/assert-organisation-rates-and-limits', () => ({
  assertOrganisationRatesAndLimits: vi.fn(),
}));
vi.mock('@documenso/lib/server-only/pdf/generate-audit-log-pdf', () => ({ generateAuditLogPdf: auditPdf }));
vi.mock('@documenso/lib/server-only/pdf/generate-certificate-pdf', () => ({ generateCertificatePdf: certificatePdf }));
vi.mock('../../../apps/remix/server/api/files/files.helpers', () => ({ handleEnvelopeItemFileRequest: fileResponse }));

const fixture = (teamId: number) => ({
  ...envelopeFixture({
    id: `envelope_${teamId}`,
    secondaryId: `document_${teamId}`,
    status: DocumentStatus.COMPLETED,
    completedAt: new Date('2026-09-12T00:00:00Z'),
    teamId,
    team: { id: teamId, url: `team-${teamId}` },
  }),
  envelopeItems: [
    {
      id: `item_${teamId}`,
      envelopeId: `envelope_${teamId}`,
      documentDataId: `data_${teamId}`,
      title: 'Synthetic PDF',
      order: 0,
      documentData: { id: `data_${teamId}` },
    },
  ],
});

const rows = [fixture(10), fixture(20)];
const app = new Hono<HonoEnv>()
  .use('*', async (c, next) => {
    c.set('logger', logger);
    await next();
  })
  .route('/', downloadRoute);

beforeEach(() => {
  vi.clearAllMocks();
  logger.level = 'silent';
  db.apiToken.findFirst.mockImplementation(async ({ where }: { where: { token: string } }) => {
    if (where.token !== hashString('api_test_download')) {
      return null;
    }
    const user = { id: 7, name: 'Synthetic owner', email: 'owner@example.invalid', disabled: false };
    return {
      id: 10,
      teamId: 10,
      user,
      expires: null,
      lastUsedAt: new Date(),
      team: { organisationId: 'org_a', organisation: { owner: user, organisationClaim: {} } },
    };
  });
  db.apiToken.updateMany.mockResolvedValue({ count: 1 });
  getTeam.mockImplementation(async ({ teamId }: { teamId: number }) => ({
    id: teamId,
    teamEmail: null,
    currentTeamRole: TeamMemberRole.ADMIN,
  }));
  db.envelope.findFirst.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => rows.find((row) => matchesQuery(row, where)) ?? null,
  );
  const pdf = { save: async () => new Uint8Array([37, 80, 68, 70]) };
  auditPdf.mockResolvedValue(pdf);
  certificatePdf.mockResolvedValue(pdf);
  fileResponse.mockImplementation(async () => new Response('%PDF', { headers: { 'Content-Type': 'application/pdf' } }));
});

const paths = [
  (teamId: number) => `/envelope/envelope_${teamId}/audit-log/download`,
  (teamId: number) => `/envelope/envelope_${teamId}/certificate/download`,
  (teamId: number) => `/document/${teamId}/download`,
];

describe('A-02: Hono downloads that shadow the tRPC API', () => {
  for (const path of paths) {
    it(`refuses the foreign PDF at ${path(20)} before rendering or reading storage`, async () => {
      const response = await app.request(path(20), { headers: { Authorization: 'Bearer api_test_download' } });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Document not found' });
      expect(auditPdf).not.toHaveBeenCalled();
      expect(certificatePdf).not.toHaveBeenCalled();
      expect(fileResponse).not.toHaveBeenCalled();
    });

    it(`keeps authorized same-team downloads working at ${path(10)}`, async () => {
      const response = await app.request(path(10), { headers: { Authorization: 'api_test_download' } });
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(await response.text()).toBe('%PDF');
    });
  }
});
