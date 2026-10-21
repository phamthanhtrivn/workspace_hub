import { z } from "zod";

export const citationSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  label: z.string(),
  text: z.string(),
  name: z.string(),
  documentId: z.string(),
  versionId: z.string(),
  page: z.number().nullable().optional(),
  position: z.number(),
});
const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  revision: z.string(),
  document_id: z.string(),
  version_id: z.string(),
  status: z.string(),
  progress: z.number(),
  chunk_count: z.number(),
  error: z.string().nullable(),
});
const derivedSchema = z.object({
  id: z.string(),
  content: z.string(),
  citations: z.array(citationSchema),
  hidden: z.boolean().optional(),
});
export const notebookListSchema = z.array(
  z.object({ id: z.string(), title: z.string(), updated_at: z.string() }),
);
export const notebookSchema = z.object({
  id: z.string(),
  title: z.string(),
  sources: z.array(sourceSchema),
  messages: z.array(derivedSchema.extend({ role: z.string() })),
  notes: z.array(derivedSchema.extend({ title: z.string() })),
  artifacts: z.array(
    derivedSchema.extend({
      kind: z.string(),
      status: z.string(),
      progress: z.number(),
      error: z.string().nullable(),
    }),
  ),
});
export type Notebook = z.infer<typeof notebookSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Citation = z.infer<typeof citationSchema>;
