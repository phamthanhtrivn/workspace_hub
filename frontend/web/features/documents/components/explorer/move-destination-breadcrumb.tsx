import React from "react";
import { Folder } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { DocumentDropDestination } from "../../types/document-bulk.types";
import { buildDocumentDropPath } from "../../utils/document-bulk";

export function MoveDestinationBreadcrumb({
  destination,
}: {
  destination: DocumentDropDestination;
}) {
  const path = destination.path ?? buildDocumentDropPath(destination);

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Destination</p>
      <Breadcrumb
        aria-label="Move destination"
        className="min-w-0 rounded-control border border-border bg-muted/40 px-3 py-2"
      >
        <BreadcrumbList className="gap-1 text-xs font-medium">
          {path.map((folder, index) => (
            <React.Fragment key={folder.id ?? "root"}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {index === 0 ? (
                  <Folder
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 text-warning-content"
                  />
                ) : null}
                <span
                  className={
                    "min-w-0 break-words [overflow-wrap:anywhere] " +
                    (index === path.length - 1
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground")
                  }
                >
                  {folder.name}
                </span>
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
