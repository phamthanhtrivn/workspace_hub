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
  imageId: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});
const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  revision: z.string(),
  document_id: z.string(),
  version_id: z.string(),
  size_bytes: z.coerce.number().nonnegative(),
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
  messages: z.array(
    derivedSchema.extend({
      role: z.string(),
      artifact_id: z.string().nullable().optional(),
      summary_status: z.string().nullable().optional(),
      summary_error: z.string().nullable().optional(),
      sources: z
        .array(z.object({ id: z.string(), revision: z.string() }))
        .default([]),
    }),
  ),
  notes: z.array(derivedSchema.extend({ title: z.string() })),
  artifacts: z.array(
    derivedSchema.extend({
      kind: z.string(),
      status: z.string(),
      progress: z.number(),
      error: z.string().nullable(),
      sources: z
        .array(z.object({ id: z.string(), revision: z.string() }))
        .default([]),
    }),
  ),
});
export type Notebook = z.infer<typeof notebookSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Citation = z.infer<typeof citationSchema>;
