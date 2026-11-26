import { z } from "zod";

export const NOTEBOOK_DESCRIPTION_LIMIT = 1000;
export const NOTEBOOK_CATEGORY_LIMIT = 50;
export const NOTEBOOK_DEFAULT_THEME = "navy";

export const notebookThemeSchema = z.enum(["navy", "ocean", "sky", "emerald"]);
export type NotebookTheme = z.infer<typeof notebookThemeSchema>;

export const notebookThemes = {
  navy: {
    label: "Deep navy",
    strip: "bg-primary",
    icon: "bg-primary-soft text-primary-soft-foreground",
    badge:
      "border-primary-outline/20 bg-primary-soft text-primary-soft-foreground",
  },
  ocean: {
    label: "Ocean blue",
    strip: "bg-info-content",
    icon: "bg-info-soft text-info-content",
    badge: "border-info-outline/20 bg-info-soft text-info-content",
  },
  sky: {
    label: "Sky accent",
    strip: "bg-info-outline",
    icon: "bg-info-soft text-info-content",
    badge: "border-info-outline/30 bg-info-soft/60 text-info-content",
  },
  emerald: {
    label: "Sage green",
    strip: "bg-success",
    icon: "bg-success-soft text-success-content",
    badge: "border-success-outline/20 bg-success-soft text-success-content",
  },
} as const satisfies Record<
  NotebookTheme,
  { label: string; strip: string; icon: string; badge: string }
>;

export const notebookMetadataSchema = z.object({
  description: z.string().max(NOTEBOOK_DESCRIPTION_LIMIT).default(""),
  category: z.string().max(NOTEBOOK_CATEGORY_LIMIT).default(""),
  color_theme: notebookThemeSchema.default(NOTEBOOK_DEFAULT_THEME),
});
export type NotebookMetadata = z.infer<typeof notebookMetadataSchema>;
export type NotebookInput = NotebookMetadata & { title: string };
