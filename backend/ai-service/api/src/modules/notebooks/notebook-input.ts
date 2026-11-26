import { z } from "zod";
import { title } from "../../common/validation";

const metadata = z.object({
  title,
  description: z.string().trim().max(1000),
  category: z.string().trim().max(50),
  color_theme: z.enum(["navy", "ocean", "sky", "emerald"]),
});

export const createNotebookInput = metadata
  .extend({
    description: metadata.shape.description.default(""),
    category: metadata.shape.category.default(""),
    color_theme: metadata.shape.color_theme.default("navy"),
  })
  .strict();

// Title-only requests from existing clients preserve the notebook's metadata.
export const updateNotebookInput = metadata
  .partial()
  .strict()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    { message: "Provide at least one notebook field." },
  );
export type CreateNotebookInput = z.infer<typeof createNotebookInput>;
export type UpdateNotebookInput = z.infer<typeof updateNotebookInput>;
