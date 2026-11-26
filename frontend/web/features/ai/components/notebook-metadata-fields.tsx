"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  NOTEBOOK_DESCRIPTION_LIMIT,
  NOTEBOOK_CATEGORY_LIMIT,
  notebookThemes,
  type NotebookMetadata,
  type NotebookTheme,
} from "../types/notebook-presentation";

export function NotebookMetadataFields({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: NotebookMetadata;
  onChange: (metadata: NotebookMetadata) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <label htmlFor={`${id}-description`} className="text-sm font-medium">
          Short description{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id={`${id}-description`}
          rows={3}
          value={value.description}
          maxLength={NOTEBOOK_DESCRIPTION_LIMIT}
          disabled={disabled}
          placeholder="What documents or topics will you explore here?"
          onChange={(event) =>
            onChange({ ...value, description: event.target.value })
          }
          className="resize-y"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-category`} className="text-sm font-medium">
          Category tag{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input
          id={`${id}-category`}
          value={value.category}
          maxLength={NOTEBOOK_CATEGORY_LIMIT}
          disabled={disabled}
          placeholder="e.g. Academic, Work, Research"
          onChange={(event) =>
            onChange({ ...value, category: event.target.value })
          }
        />
      </div>
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="text-sm font-medium">Accent color</legend>
        <div className="flex flex-wrap gap-2">
          {(
            Object.entries(notebookThemes) as [
              NotebookTheme,
              (typeof notebookThemes)[NotebookTheme],
            ][]
          ).map(([theme, style]) => (
            <Button
              key={theme}
              type="button"
              variant="unstyled"
              aria-label={style.label}
              aria-pressed={value.color_theme === theme}
              title={style.label}
              onClick={() => onChange({ ...value, color_theme: theme })}
              className={cn(
                "grid size-10 place-items-center rounded-full border-2 border-transparent p-1",
                value.color_theme === theme && "border-ring",
              )}
            >
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full",
                  style.strip,
                )}
              >
                {value.color_theme === theme && (
                  <Check
                    className="size-4 text-primary-foreground"
                    aria-hidden="true"
                  />
                )}
              </span>
            </Button>
          ))}
        </div>
      </fieldset>
    </>
  );
}
