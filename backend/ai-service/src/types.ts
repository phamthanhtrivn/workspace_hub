export type Actor = { id: string; email: string };
export type Source = {
  id: string;
  notebook_id: string;
  document_id: string;
  version_id: string;
  revision: string;
  name: string;
  size_bytes: number;
  status: string;
  progress: number;
  chunk_count: number;
  error: string | null;
};
export type Manifest = {
  documentId: string;
  versionId: string;
  revision: string;
  name: string;
  sizeBytes: number;
  current: boolean;
  downloadUrl?: string;
};
export type Evidence = {
  id: string;
  sourceId: string;
  text: string;
  page?: number;
  position: number;
};
export type Citation = Evidence & {
  label: string;
  name: string;
  documentId: string;
  versionId: string;
};
export type Snapshot = { id: string; revision: string };
