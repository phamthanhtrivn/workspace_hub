import { ItemType } from '@prisma/client';
import { DocumentRole } from '../../../common/enums/document.enum';

export interface DocumentChatMetadata {
  id: string;
  name: string;
  type: ItemType;
  sizeBytes: number;
  containedSizeBytes?: number;
  mimeType: string | null;
  ownerEmail: string;
  ownerName: string | null;
  createdAt: Date;
  hasPermission: boolean;
  userRole: DocumentRole;
  projectId: string | null;
}
