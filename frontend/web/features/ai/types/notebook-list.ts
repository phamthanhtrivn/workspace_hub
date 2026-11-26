import { z } from "zod";
import { notebookListSchema } from "../types";
import type { NotebookMetadata } from "./notebook-presentation";

export const NOTEBOOK_PAGE_SIZE = 12;
export const NOTEBOOK_TITLE_LIMIT = 200;
export const NOTEBOOK_LIST_DEFAULTS = {
  page: 1,
  search: "",
  sort: "updated_desc",
} as const;
export const notebookSortOptions = [
  { value: "updated_desc", label: "Recently updated" },
  { value: "updated_asc", label: "Least recently updated" },
  { value: "title_asc", label: "Name: A–Z" },
  { value: "title_desc", label: "Name: Z–A" },
] as const;
export type NotebookSort = (typeof notebookSortOptions)[number]["value"];
export interface NotebookListParams {
  page: number;
  search: string;
  sort: NotebookSort;
}
export type NotebookListItem = z.infer<typeof notebookListSchema>[number];
export type NotebookDialogAction =
  | { type: "create" }
  | {
      type: "rename" | "delete";
      notebook: Pick<NotebookListItem, "id" | "title"> &
        Partial<NotebookMetadata>;
    };
export const notebookPageSchema = z.object({
  data: notebookListSchema,
  meta: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().positive(),
    totalNotebooks: z.number().int().nonnegative(),
  }),
});
export const notebookKeys = {
  lists: (userId: string) => ["notebook-ai", userId, "list"] as const,
  list: (userId: string, params: NotebookListParams) =>
    [...notebookKeys.lists(userId), params] as const,
};
