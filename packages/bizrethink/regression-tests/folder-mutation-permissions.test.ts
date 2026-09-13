import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { deleteFolder } from '@documenso/lib/server-only/folder/delete-folder';
import { updateFolder } from '@documenso/lib/server-only/folder/update-folder';
import type { Folder, Prisma } from '@prisma/client';
import { DocumentVisibility, FolderType, TeamMemberRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { matchesPermissionQuery, permissionTeam } from './document-permission-fixture';

const { db, getTeam } = vi.hoisted(() => ({
  db: {
    folder: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), delete: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
  getTeam: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/server-only/team/get-team', () => ({ getTeamById: getTeam }));
type Row = Folder & { team: ReturnType<typeof permissionTeam> };
const folder = (
  id: string,
  parentId: string | null = null,
  visibility: DocumentVisibility = DocumentVisibility.EVERYONE,
): Row => ({
  id,
  parentId,
  visibility,
  userId: 8,
  teamId: 10,
  name: id,
  pinned: false,
  type: FolderType.DOCUMENT,
  createdAt: new Date('2026-09-12'),
  updatedAt: new Date('2026-09-12'),
  team: permissionTeam(),
});
let rows: Row[];
let role: TeamMemberRole;
const remove = () => deleteFolder({ userId: 7, teamId: 10, folderId: 'root' });
const move = (parentId: string | null) => updateFolder({ userId: 7, teamId: 10, folderId: 'root', data: { parentId } });
beforeEach(() => {
  vi.clearAllMocks();
  role = TeamMemberRole.MEMBER;
  rows = [
    folder('root'),
    folder('child', 'root'),
    folder('hidden', 'child', DocumentVisibility.ADMIN),
    folder('destination'),
  ];
  getTeam.mockImplementation(async ({ teamId }: { teamId: number }) => {
    if (teamId !== 10) {
      throw new AppError(AppErrorCode.NOT_FOUND);
    }
    return permissionTeam(teamId, role);
  });
  const find = async ({ where }: { where: Record<string, unknown> }) =>
    rows.find((row) => matchesPermissionQuery(row, where)) ?? null;
  db.folder.findFirst.mockImplementation(find);
  db.folder.findUnique.mockImplementation(find);
  db.folder.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    rows.filter((row) => matchesPermissionQuery(row, where)),
  );
  db.folder.delete.mockImplementation(find);
  db.folder.update.mockImplementation(find);
  db.$transaction.mockImplementation(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db));
  // Lock acquisition is exercised against PostgreSQL by the companion HTTP spec.
  // This adapter supplies matching stored rows; it does not claim to model locks.
  db.$queryRaw.mockImplementation(async (query: Prisma.Sql) => {
    const parentLookup = query.strings.join('').includes('"parentId" IN');
    return rows.filter((row) => query.values.includes(parentLookup ? row.parentId : row.id));
  });
});
describe('A-24 folder operations honor every affected visibility boundary', () => {
  it('refuses deleting a visible parent containing a hidden grandchild', async () => {
    await expect(remove()).rejects.toMatchObject({ code: AppErrorCode.NOT_FOUND });
    expect(db.folder.delete).not.toHaveBeenCalled();
  });
  it('refuses a malformed cross-team descendant instead of cascading into it', async () => {
    rows[2].visibility = DocumentVisibility.EVERYONE;
    rows[2].teamId = 20;
    await expect(remove()).rejects.toMatchObject({ code: AppErrorCode.NOT_FOUND });
    expect(db.folder.delete).not.toHaveBeenCalled();
  });
  it('allows an admin to delete an entirely permitted nested tree', async () => {
    role = TeamMemberRole.ADMIN;
    await expect(remove()).resolves.toMatchObject({ id: 'root' });
    expect(db.folder.delete).toHaveBeenCalledOnce();
  });
  it('allows a member to delete a visible leaf', async () => {
    rows = [folder('root')];
    await expect(remove()).resolves.toMatchObject({ id: 'root' });
  });
  it('refuses moving into a hidden destination', async () => {
    rows[3].visibility = DocumentVisibility.ADMIN;
    await expect(move('destination')).rejects.toMatchObject({ code: AppErrorCode.NOT_FOUND });
    expect(db.folder.update).not.toHaveBeenCalled();
  });
  it('preserves a permitted move and moving back to the root', async () => {
    await expect(move('destination')).resolves.toMatchObject({ id: 'root' });
    await expect(move(null)).resolves.toMatchObject({ id: 'root' });
  });
  it('preserves the existing prevention of moves into a descendant', async () => {
    await expect(move('child')).rejects.toMatchObject({ code: AppErrorCode.INVALID_REQUEST });
    expect(db.folder.update).not.toHaveBeenCalled();
  });
});
