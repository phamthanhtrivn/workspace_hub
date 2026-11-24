export type DocumentCopyTab = "channel" | "direct";
export type CopyDeliveryStatus = "pending" | "sending" | "sent" | "failed";

export interface DirectCopyRecipient {
  conversationId: string;
  userId: string;
  name: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface DocumentCopyTarget {
  type: DocumentCopyTab;
  chatId: string;
  label: string;
}

export interface DocumentCopyDelivery extends DocumentCopyTarget {
  status: CopyDeliveryStatus;
  error?: string;
}

export interface DocumentCopyBatch {
  documentId: string;
  actorId: string;
  introMessage: string;
  isFolder: boolean;
  sourceVersionId?: string;
  deliveries: DocumentCopyDelivery[];
}
