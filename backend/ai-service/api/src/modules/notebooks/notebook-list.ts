import { z } from "zod";

export const NOTEBOOK_PAGE_SIZE = 12;
export const notebookListQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limit: z.coerce.number().int().min(1).max(48).default(NOTEBOOK_PAGE_SIZE),
    search: z.string().trim().max(200).default(""),
    sort: z
      .enum(["updated_desc", "updated_asc", "title_asc", "title_desc"])
      .default("updated_desc"),
  })
  .strict();

export type NotebookListQuery = z.infer<typeof notebookListQuery>;
export interface NotebookListRow {
  items: {
    id: string;
    title: string;
    description: string;
    category: string;
    color_theme: string;
    sources_count: number;
    notes_count: number;
    updated_at: string;
  }[];
  total: number;
  total_pages: number;
  page: number;
  total_notebooks: number;
}

const ordering: Record<NotebookListQuery["sort"], string> = {
  updated_desc: "updated_at DESC, id DESC",
  updated_asc: "updated_at ASC, id ASC",
  title_asc: "lower(title) ASC, id ASC",
  title_desc: "lower(title) DESC, id DESC",
};

// A single snapshot counts, clamps the requested page and reads its items.
// Only the fixed ordering map is interpolated; user values remain parameters.
export function notebookListSql(sort: NotebookListQuery["sort"]) {
  return `WITH filtered AS (
    SELECT id, title, description, category, color_theme, updated_at FROM notebook_ai.notebooks
    WHERE owner_id = $1 AND ($2 = '' OR strpos(lower(title), lower($2)) > 0
      OR strpos(lower(description), lower($2)) > 0 OR strpos(lower(category), lower($2)) > 0)
  ), totals AS (
    SELECT count(*)::int AS total,
      greatest(1, ceil(count(*)::numeric / $3::int))::int AS total_pages FROM filtered
  ), bounds AS (
    SELECT total, total_pages, least($4::int, total_pages) AS page,
      (SELECT count(*)::int FROM notebook_ai.notebooks WHERE owner_id = $1) AS total_notebooks FROM totals
  )
  SELECT bounds.*, coalesce((SELECT json_agg(notebook_page) FROM (
    SELECT selected.*,
      (SELECT count(*)::int FROM notebook_ai.sources WHERE notebook_id = selected.id) AS sources_count,
      (SELECT count(*)::int FROM notebook_ai.notes WHERE notebook_id = selected.id) AS notes_count
    FROM (
      SELECT * FROM filtered ORDER BY ${ordering[sort]}
      LIMIT $3::int OFFSET ((bounds.page - 1) * $3::int)
    ) selected ORDER BY ${ordering[sort]}
  ) notebook_page), '[]'::json) AS items FROM bounds`;
}
