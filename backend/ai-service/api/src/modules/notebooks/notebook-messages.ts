import { rows } from "../../infrastructure/database/database";
import type { Citation, Snapshot } from "../../common/types";

type NotebookMessage = {
  id: string;
  notebook_id: string;
  role: string;
  content: string;
  citations: Citation[];
  sources: Snapshot[];
  created_at: Date;
};

// Completed legacy summaries remain readable as ordinary chat messages.
const messages = `SELECT m.id,m.notebook_id,m.role,m.sources,m.created_at,
  CASE WHEN a.status='COMPLETED' THEN a.content ELSE m.content END AS content,
  CASE WHEN a.status='COMPLETED' THEN a.citations ELSE m.citations END AS citations
  FROM notebook_ai.messages m LEFT JOIN notebook_ai.artifacts a ON a.id=m.artifact_id`;
const visible = "(m.artifact_id IS NULL OR a.status='COMPLETED')";

export function notebookMessages(notebookId: string, limit = 100) {
  return rows<NotebookMessage>(
    `${messages} WHERE m.notebook_id=$1 AND ${visible}
     AND m.role IN ('USER','ASSISTANT') ORDER BY m.created_at DESC,m.id DESC LIMIT $2`,
    [notebookId, limit],
  );
}

export async function notebookAnswer(notebookId: string, messageId: string) {
  const [message] = await rows<NotebookMessage>(
    `${messages} WHERE m.notebook_id=$1 AND m.id=$2 AND m.role='ASSISTANT' AND ${visible}`,
    [notebookId, messageId],
  );

  return message;
}
