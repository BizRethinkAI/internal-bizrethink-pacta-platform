import { TEAM_DOCUMENT_VISIBILITY_MAP } from '@documenso/lib/constants/teams';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { DeleteFolderOptions } from '@documenso/lib/server-only/folder/delete-folder';
import type { UpdateFolderOptions } from '@documenso/lib/server-only/folder/update-folder';
import { getTeamById } from '@documenso/lib/server-only/team/get-team';
import { prisma } from '@documenso/prisma';
import { type DocumentVisibility, type Folder, Prisma } from '@prisma/client';

type LockedFolder = Pick<Folder, 'id' | 'parentId' | 'teamId' | 'type' | 'visibility'>;
const unavailable = () => new AppError(AppErrorCode.NOT_FOUND, { message: 'Folder not found' });
const invalidMove = () =>
  new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Cannot move a folder into itself or its descendant' });

const lockFolders = async (tx: Prisma.TransactionClient, ids: string[], teamId: number) =>
  await tx.$queryRaw<LockedFolder[]>(Prisma.sql`
    SELECT "id", "parentId", "teamId", "type", "visibility" FROM "Folder"
    WHERE "id" IN (${Prisma.join(ids)}) AND "teamId" = ${teamId}
    ORDER BY "id" FOR UPDATE
  `);

const assertVisible = (
  folder: LockedFolder | undefined,
  teamId: number,
  visibility: DocumentVisibility[],
): LockedFolder => {
  if (!folder || folder.teamId !== teamId || !visibility.includes(folder.visibility)) {
    throw unavailable();
  }
  return folder;
};

/** Lock parents BEFORE discovering their children. PostgreSQL's parent FK
 * key-share checks then block concurrent insertion/moves into a checked parent;
 * row locks also prevent visibility changes until the cascade commits.
 * A single recursive snapshot followed by locks would miss a newly added child.
 */
export const deleteFolderWithPermissions = async ({ userId, teamId, folderId }: DeleteFolderOptions) => {
  const team = await getTeamById({ userId, teamId });
  const visibility = TEAM_DOCUMENT_VISIBILITY_MAP[team.currentTeamRole];
  return await prisma.$transaction(
    async (tx) => {
      const root = assertVisible((await lockFolders(tx, [folderId], teamId))[0], teamId, visibility);
      let parents = [root.id];
      const visited = new Set(parents);
      while (parents.length > 0) {
        // Do not filter by team or visibility: that would hide a forbidden
        // descendant that the database's cascade would nevertheless delete.
        const children = await tx.$queryRaw<LockedFolder[]>(Prisma.sql`
        SELECT "id", "parentId", "teamId", "type", "visibility" FROM "Folder"
        WHERE "parentId" IN (${Prisma.join(parents)}) ORDER BY "id" FOR UPDATE
      `);
        for (const child of children) {
          assertVisible(child, teamId, visibility);
          if (child.type !== root.type || visited.has(child.id)) {
            throw unavailable();
          }
          visited.add(child.id);
        }
        parents = children.map((child) => child.id);
      }
      // Preserve the existing cascade: folders disappear, envelope/PDF records
      // survive with their folder reference set null by the existing FK.
      return await tx.folder.delete({ where: { id: root.id, teamId } });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
};

/** Keep source/destination visibility stable from validation through mutation. */
export const updateFolderWithPermissions = async ({ userId, teamId, folderId, data }: UpdateFolderOptions) => {
  const team = await getTeamById({ userId, teamId });
  const allowed = TEAM_DOCUMENT_VISIBILITY_MAP[team.currentTeamRole];
  const { parentId, name, visibility, pinned } = data;
  return await prisma.$transaction(
    async (tx) => {
      const locked = await lockFolders(tx, [...new Set([folderId, ...(parentId ? [parentId] : [])])].sort(), teamId);
      const source = assertVisible(
        locked.find((folder) => folder.id === folderId),
        teamId,
        allowed,
      );
      if (parentId) {
        const destination = assertVisible(
          locked.find((folder) => folder.id === parentId),
          teamId,
          allowed,
        );
        if (destination.type !== source.type) {
          throw unavailable();
        }
        const visited = new Set([folderId]);
        let ancestorId: string | null = destination.id;
        while (ancestorId) {
          if (visited.has(ancestorId)) {
            throw invalidMove();
          }
          visited.add(ancestorId);
          const ancestor: { parentId: string | null } | null = await tx.folder.findUnique({
            where: { id: ancestorId },
            select: { parentId: true },
          });
          ancestorId = ancestor?.parentId ?? null;
        }
      }
      return await tx.folder.update({ where: { id: folderId, teamId }, data: { parentId, name, visibility, pinned } });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
};
