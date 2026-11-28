"use client";

import { CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { DocumentCopyBatch } from "../../types/document-copy.types";
import { DOCUMENT_COPY_MESSAGES } from "../../types/document-copy.constants";

export function CopyDeliveryResults({ batch }: { batch: DocumentCopyBatch }) {
  const sent = batch.deliveries.filter(
    (delivery) => delivery.status === "sent",
  ).length;

  return (
    <div className="space-y-2">
      <p
        role="status"
        className="text-xs font-semibold tabular-nums text-muted-foreground"
      >
        {sent} of {batch.deliveries.length} sent
      </p>
      <ul
        aria-label="Copy delivery results"
        className="max-h-44 overflow-y-auto rounded-panel border border-border bg-background divide-y divide-border"
      >
        {batch.deliveries.map((delivery) => (
          <li
            key={delivery.chatId}
            className="flex items-start gap-2 px-3 py-2 text-xs"
          >
            {delivery.status === "sending" ? (
              <Spinner size={14} />
            ) : delivery.status === "sent" ? (
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-success-content"
              />
            ) : delivery.status === "failed" ? (
              <CircleAlert
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-destructive-content"
              />
            ) : (
              <Clock3
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              />
            )}
            <div className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {delivery.label}
              </span>
              {delivery.error && (
                <p className="mt-1 break-words text-destructive-content">
                  {delivery.error}
                </p>
              )}
            </div>
            <span className="shrink-0 text-muted-foreground">
              {delivery.status === "sent"
                ? "Sent"
                : delivery.status === "failed"
                  ? "Failed"
                  : delivery.status === "sending"
                    ? "Sending"
                    : "Waiting"}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {DOCUMENT_COPY_MESSAGES.locked}
      </p>
    </div>
  );
}
