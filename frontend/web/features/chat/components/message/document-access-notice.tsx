import { Lock } from "lucide-react";
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

  return (
    <div
      role="status"
      className="my-3 w-full max-w-sm rounded-panel border border-border bg-muted p-4 text-sm text-foreground"
    >
      <div className="flex items-start gap-3">
        <Lock
          size={20}
          aria-hidden="true"
          className="shrink-0 text-muted-foreground"
        />
        <p className="min-w-0 break-words">{message}</p>
      </div>
      <Button
        variant="ghost"
        className="mt-3"
        loading={busy}
        disabled={busy}
        onClick={onRetry}
      >
        Check access again
      </Button>
    </div>
  );
}
