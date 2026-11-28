"use client";

import { Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { QueryFeedback } from "@/components/common/query-feedback";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector } from "@/store/store";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";
import type { DocumentItem } from "../../types/documents.types";
import type { DocumentCopyTab } from "../../types/document-copy.types";
import { DOCUMENT_COPY_TABS } from "../../types/document-copy.constants";
import { DocumentIcon } from "../common/document-icon";
import { useShareToChat } from "../../hooks/useShareToChat";
import { DirectCopyPicker } from "./direct-copy-picker";
import { ChannelCopyPicker } from "./channel-copy-picker";
import { CopyDeliveryResults } from "./copy-delivery-results";

interface Props {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  item: DocumentItem | null;
  projectId?: string;
}

export function ShareToChatModal(props: Props) {
  const open = props.open ?? props.isOpen ?? false;
  const userId = useAppSelector((state) => state.auth.userId);

  return open && props.item ? (
    <SendCopyForm
      key={`${userId}:${props.item.id}`}
      {...props}
      item={props.item}
    />
  ) : null;
}

function SendCopyForm({ item, onClose }: Props & { item: DocumentItem }) {
  const share = useShareToChat({ item, onSuccess: onClose });
  const sendLabel = share.failedCount
    ? `Retry failed (${share.failedCount})`
    : share.isSubmitting
      ? "Sending copies…"
      : share.selectedCount > 1
        ? `Send copies (${share.selectedCount})`
        : "Send copy";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !share.isSubmitting) onClose();
      }}
    >
      <DialogContent
        className={`${dialogLayout.surface} max-w-lg bg-card p-0 text-card-foreground`}
        showCloseButton={!share.isSubmitting}
      >
        <DialogHeader className="border-b border-border">
          <DialogTitle>Send a copy</DialogTitle>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <DocumentIcon
              item={item}
              iconSize={18}
              className="size-8 shrink-0 rounded-full"
            />
            <span className="truncate">{item.name}</span>
          </div>
        </DialogHeader>
        <div className={`${dialogLayout.body} space-y-4 p-5`}>
          <Tabs
            value={share.activeTab}
            onValueChange={(value) => share.changeTab(value as DocumentCopyTab)}
          >
            <TabsList className="grid h-auto w-full grid-cols-2">
              {DOCUMENT_COPY_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  disabled={share.locked}
                  className="gap-1.5"
                >
                  <tab.icon aria-hidden="true" className="size-4 shrink-0" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {share.targetsLoading ? (
            <div
              role="status"
              className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <Spinner size={18} />
              Loading destinations…
            </div>
          ) : share.targetError ? (
            <QueryFeedback
              label="copy destinations"
              error
              onRetry={() => void share.retryTargets()}
            />
          ) : share.activeTab === "direct" ? (
            <DirectCopyPicker
              recipients={share.directRecipients}
              selected={share.selectedRecipients}
              locked={share.locked}
              onToggle={share.toggleDirect}
            />
          ) : (
            <ChannelCopyPicker
              spaces={share.spaces}
              channels={share.channels}
              selectedSpaceId={share.selectedSpaceId}
              selectedChannelId={share.selectedChannelId}
              locked={share.locked}
              onSpaceChange={share.setSelectedSpaceId}
              onChannelChange={share.setSelectedChannelId}
            />
          )}
          <Textarea
            aria-label="Message (optional)"
            value={share.introMessage}
            onChange={(event) => share.setIntroMessage(event.target.value)}
            disabled={share.locked}
            placeholder="Message (optional)"
            className="min-h-20"
          />
          {share.batch && <CopyDeliveryResults batch={share.batch} />}
          {share.error && (
            <p role="alert" className="text-sm text-destructive-content">
              {share.error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={share.isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            disabled={!share.canSubmit}
            loading={share.isSubmitting}
            onClick={() => void share.handleShare()}
          >
            <Send aria-hidden="true" />
            {sendLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ShareToChatModal;
