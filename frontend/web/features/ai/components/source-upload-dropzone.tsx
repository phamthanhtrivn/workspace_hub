"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  NOTEBOOK_UPLOAD_ACCEPT,
  type UploadRejection,
  type UploadStage,
} from "../upload";

function isFileDrag(event: DragEvent) {
  return Array.from(event.dataTransfer.types).includes("Files");
}

export function SourceUploadDropzone({
  disabled,
  stage,
  onFiles,
}: {
  disabled: boolean;
  stage: UploadStage | null;
  onFiles: (files: File[], rejected?: UploadRejection[]) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const descriptionId = useId();
  const reset = () => {
    depth.current = 0;
    setDragging(false);
  };

  useEffect(() => {
    const clearDrag = () => {
      depth.current = 0;
      setDragging(false);
    };
    window.addEventListener("dragend", clearDrag);
    window.addEventListener("blur", clearDrag);

    return () => {
      window.removeEventListener("dragend", clearDrag);
      window.removeEventListener("blur", clearDrag);
    };
  }, []);

  const drop = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    reset();
    if (disabled) return;
    const files: File[] = [];
    const rejected: UploadRejection[] = [];
    const entries = Array.from(event.dataTransfer.items).filter(
      (item) => item.kind === "file",
    );
    if (!entries.length) files.push(...Array.from(event.dataTransfer.files));
    for (const item of entries) {
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        rejected.push({
          name: entry.name,
          message: `${entry.name}: folders are not supported. Drop individual files.`,
        });
      } else {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length || rejected.length) void onFiles(files, rejected);
  };

  return (
    <div
      onDragEnter={(event) => {
        if (!isFileDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) {
          depth.current++;
          setDragging(true);
        }
      }}
      onDragOver={(event) => {
        if (!isFileDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = disabled ? "none" : "copy";
      }}
      onDragLeave={(event) => {
        if (!isFileDrag(event) && !depth.current) return;
        event.stopPropagation();
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDragging(false);
      }}
      onDrop={drop}
    >
      <Button
        type="button"
        variant="unstyled"
        disabled={disabled}
        aria-label="Choose source files"
        aria-describedby={descriptionId}
        aria-busy={stage !== null || undefined}
        className={cn(
          "flex w-full flex-col items-center gap-3 rounded-panel border border-dashed border-border px-5 py-8 text-center transition-colors hover:bg-accent/40",
          dragging && !disabled && "border-primary bg-accent",
        )}
        onClick={() => input.current?.click()}
      >
        <Upload className="size-8 text-link" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">
          {dragging && !disabled
            ? "Drop files to upload"
            : "Drag files here or choose files"}
        </span>
        <span
          id={descriptionId}
          className="max-w-prose text-sm font-normal text-muted-foreground"
        >
          PDF, DOCX, TXT, MD, PNG, JPEG and WebP. Up to 20 MiB per file and 50
          MiB per notebook.
        </span>
        <span className={cn(buttonVariants(), "pointer-events-none")}>
          {stage ? <Spinner size={14} /> : <Upload aria-hidden="true" />}
          {stage === "ADDING"
            ? "Adding sources..."
            : stage
              ? "Uploading..."
              : "Choose files"}
        </span>
      </Button>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        disabled={disabled}
        accept={NOTEBOOK_UPLOAD_ACCEPT}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (!disabled && files.length) void onFiles(files);
        }}
      />
    </div>
  );
}
