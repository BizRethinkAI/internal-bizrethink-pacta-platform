import { deleteFolderWithPermissions } from '@bizrethink/customizations/server-only/folder-permissions';

export type DeleteFolderOptions = {
  userId: number;
  teamId: number;
  folderId: string;
};

// MODIFIED for BizRethink (overlay 084): authorize and lock all destructive descendants.
export const deleteFolder = deleteFolderWithPermissions;
