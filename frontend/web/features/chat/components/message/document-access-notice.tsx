import { LockKeyhole, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SHARED_DOCUMENT_ACCESS_CODE as CODE,
  DOCUMENT_ACCESS_NOTICE_MESSAGES,
  DOCUMENT_ACTION_FAILED_MESSAGE,
} from "@/features/documents/types/shared-document-access.constants";
import { getSharedDocumentAccessCode } from "@/features/documents/utils/shared-document-access";

export function DocumentAccessNotice({
  error,
  denied,
  busy,
  onRetry,
}: {
  error?: unknown;
  denied?: boolean;
  busy: boolean;
  onRetry: () => void;
}) {
  const code = denied ? CODE.RESTRICTED : getSharedDocumentAccessCode(error);
  const message = code
    ? DOCUMENT_ACCESS_NOTICE_MESSAGES[code]
    : DOCUMENT_ACTION_FAILED_MESSAGE;
  const accessChanged = code === CODE.RESTRICTED || denied;

  return (
    <div
      role="status"
      className="my-3 w-full max-w-sm rounded-panel border border-border bg-card p-4 text-sm text-foreground shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive-soft text-destructive-content">
          <LockKeyhole size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="font-semibold leading-5">
            {accessChanged ? "Access removed" : "This item is unavailable"}
          </p>
          <p className="mt-1 break-words text-muted-foreground">
            {accessChanged
              ? "You no longer have access to this file or folder. Contact the person who shared it to request access."
              : message}
          </p>
        </div>
      </div>
      {!code && !denied ? (
        <Button
          variant="ghost"
          className="mt-3"
          loading={busy}
          disabled={busy}
          onClick={onRetry}
        >
          <RefreshCw size={14} aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
