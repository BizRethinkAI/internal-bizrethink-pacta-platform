import { updateFolderWithPermissions } from '@bizrethink/customizations/server-only/folder-permissions';
import type { DocumentVisibility } from '@documenso/prisma/generated/types';

export type UpdateFolderOptions = {
  userId: number;
  teamId: number;
  folderId: string;
  data: {
    parentId?: string | null;
    name?: string;
    visibility?: DocumentVisibility;
    pinned?: boolean;
  };
};

// MODIFIED for BizRethink (overlay 084): keep source and destination visibility locked through the move.
export const updateFolder = updateFolderWithPermissions;
