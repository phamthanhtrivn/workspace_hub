import { DocumentItemType } from "../types/documents.enums";
import type { DocumentItem } from "../types/documents.types";

export function isProjectRootFolder(
  item: Pick<DocumentItem, "projectId" | "parentFolderId" | "type">,
): boolean {
  return (
    Boolean(item.projectId) &&
    item.parentFolderId === null &&
    item.type === DocumentItemType.FOLDER
  );
}

export function resolveDocumentProjectContext({
  projectId: explicitProjectId,
  folderProjectId,
  path,
}: {
  projectId?: string;
  folderProjectId?: string | null;
  path: readonly { id: string | null; name: string }[];
}) {
  const projectId = explicitProjectId ?? folderProjectId ?? undefined;
  const root = projectId
    ? path.find((folder) => folder.id !== null)
    : undefined;

  return { projectId, rootFolderId: root?.id ?? null, rootLabel: root?.name };
}
