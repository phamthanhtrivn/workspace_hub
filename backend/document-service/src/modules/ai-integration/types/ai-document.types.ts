export interface AiActor {
  id: string;
  email: string;
}

export interface AiDocumentManifest {
  documentId: string;
  versionId: string;
  revision: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  etag: string;
  objectVersionId?: string;
  downloadUrl?: string;
}
