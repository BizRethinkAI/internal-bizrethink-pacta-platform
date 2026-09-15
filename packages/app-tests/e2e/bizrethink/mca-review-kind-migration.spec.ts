import { readFileSync } from 'node:fs';
import path from 'node:path';

import { prisma } from '@documenso/prisma';
import { expect, test } from '@playwright/test';
import type { Prisma } from '@prisma/client';

const migration = readFileSync(
  path.join(__dirname, '../../../prisma/migrations/20260915060000_restore_mca_review_kinds/migration.sql'),
  'utf8',
);

// Each transaction's temporary table shadows the migration's unqualified table
// name. Run the real SQL without altering application tables or other workers.
const prepareLegacyTable = async (tx: Prisma.TransactionClient) => {
  await tx.$executeRawUnsafe(`CREATE TEMP TABLE "BizrethinkMcaPackageReview" (
    "id" TEXT PRIMARY KEY, "kind" TEXT NOT NULL DEFAULT 'library',
    "snapshot" JSONB NOT NULL, "teamId" INTEGER, "organisationId" TEXT,
    "templateId" TEXT, "templateVersion" INTEGER,
    "token" TEXT NOT NULL DEFAULT 'saved-token', "fingerprint" TEXT NOT NULL DEFAULT 'saved-fingerprint',
    "reviewedTargetIds" TEXT[] NOT NULL DEFAULT ARRAY['document:frpa'],
    "completedAt" TIMESTAMP NOT NULL DEFAULT '2026-09-15 00:00:00',
    CONSTRAINT "BizrethinkMcaPackageReview_scope_check" CHECK (
      ("teamId" IS NULL AND "organisationId" IS NULL AND "templateId" IS NULL AND "templateVersion" IS NULL AND "snapshot"->>'kind' = 'library')
      OR ("teamId" IS NOT NULL AND "organisationId" IS NOT NULL AND "templateId" IS NOT NULL AND "templateVersion" IS NOT NULL AND "templateVersion" > 0 AND "snapshot"->>'kind' = 'provider')
    )
  ) ON COMMIT DROP`);
  await tx.$executeRawUnsafe(`INSERT INTO "BizrethinkMcaPackageReview"
    ("id", "kind", "snapshot", "teamId", "organisationId", "templateId", "templateVersion") VALUES
    ('library', 'library', '{"schemaVersion":1,"kind":"library"}', NULL, NULL, NULL, NULL),
    ('mislabelled', 'library', '{"schemaVersion":2,"kind":"provider","provider":{"templateId":"template-a","revision":1}}', 17, 'org-a', 'template-a', 1),
    ('provider', 'provider', '{"schemaVersion":2,"kind":"provider","provider":{"templateId":"template-b","revision":2}}', 18, 'org-b', 'template-b', 2)`);
};

type SavedRow = { id: string; kind: string; [key: string]: unknown };
const savedRows = (tx: Prisma.TransactionClient) =>
  tx.$queryRawUnsafe<SavedRow[]>('SELECT * FROM "BizrethinkMcaPackageReview" ORDER BY "id"');

test('repair preserves saved review evidence and rejects future classification/scope mismatches', async () => {
  await prisma.$transaction(async (tx) => {
    await prepareLegacyTable(tx);
    const before = await savedRows(tx);
    await tx.$executeRawUnsafe(migration);
    expect(await savedRows(tx)).toEqual(
      before.map((row) => (row.id === 'mislabelled' ? { ...row, kind: 'provider' } : row)),
    );

    const invalidWrites = [
      `UPDATE "BizrethinkMcaPackageReview" SET "kind" = 'library' WHERE "id" = 'provider'`,
      `UPDATE "BizrethinkMcaPackageReview" SET "kind" = 'provider' WHERE "id" = 'library'`,
      `UPDATE "BizrethinkMcaPackageReview" SET "kind" = 'unknown' WHERE "id" = 'library'`,
      `UPDATE "BizrethinkMcaPackageReview" SET "snapshot" = '{}' WHERE "id" = 'library'`,
      `UPDATE "BizrethinkMcaPackageReview" SET "teamId" = NULL WHERE "id" = 'provider'`,
      `UPDATE "BizrethinkMcaPackageReview" SET "templateVersion" = 0 WHERE "id" = 'provider'`,
    ];
    for (const statement of invalidWrites) {
      await tx.$executeRawUnsafe('SAVEPOINT invalid_review');
      await expect(tx.$executeRawUnsafe(statement)).rejects.toThrow(/scope_check/);
      await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT invalid_review');
      await tx.$executeRawUnsafe('RELEASE SAVEPOINT invalid_review');
    }
  });
});

test('unexpected legacy scope stops the repair atomically without partially changing other reviews', async () => {
  await prisma.$transaction(async (tx) => {
    await prepareLegacyTable(tx);
    // A missing JSON kind previously passed CHECK as UNKNOWN instead of FALSE.
    await tx.$executeRawUnsafe(
      `INSERT INTO "BizrethinkMcaPackageReview" ("id", "snapshot") VALUES ('unexpected', '{}')`,
    );
    const before = await savedRows(tx);
    await tx.$executeRawUnsafe('SAVEPOINT repair');
    await expect(tx.$executeRawUnsafe(migration)).rejects.toThrow(/scope_check/);
    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT repair');
    expect(await savedRows(tx)).toEqual(before);
  });
});
