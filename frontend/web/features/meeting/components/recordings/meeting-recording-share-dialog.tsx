"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Share2, ShieldCheck, UsersRound } from "lucide-react";
import { toast } from "sonner";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/store/store";
import { recordingApi } from "../../api/meeting-recording.api";
import { recordingErrorMessage } from "../../utils/recording-errors";
import { showMeetingActionError } from "../../utils/meeting-action-errors";
import type { MeetingRecording } from "../../types/meeting-recording.types";
import { MeetingButton } from "../ui/meeting-form-controls";
import { RecordingAccessList } from "./recording-access-list";
import { RecordingShareForm } from "./recording-share-form";

export function MeetingRecordingShareDialog({
  recording,
  onClose,
}: {
  recording: MeetingRecording;
  onClose: () => void;
}) {
  const account = useAppSelector((state) => state.auth);
  const userId = account.userId;
  const isOwner = userId === recording.ownerId;
  const client = useQueryClient();
  const [canDownload, setCanDownload] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const permissions = useQuery({
    queryKey: ["meeting-recordings", userId, "permissions", recording.id],
    queryFn: () => recordingApi.permissions(recording.id),
  });
  const action = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ["meeting-recordings", userId],
      });
      toast.success("Recording access updated");
    },
    onError: (error) =>
      showMeetingActionError(error, recordingErrorMessage(error)),
  });
  const runAction = async (key: string, operation: () => Promise<unknown>) => {
    setPendingAction(key);
    try {
      await action.mutateAsync(operation);
    } finally {
      setPendingAction(null);
    }
  };
  const updateAccess = (key: string, operation: () => Promise<unknown>) => {
    void runAction(key, operation).catch(() => {
      /* The mutation displays the API error. */
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={`${dialogLayout.surface} max-w-lg gap-0 border-border bg-card p-6 text-foreground`}
        aria-labelledby="recording-share-title"
      >
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 px-0 pb-4 pt-0 text-left">
          <div className="grid size-10 shrink-0 place-items-center rounded-panel bg-info-soft text-info-content ring-1 ring-ring">
            <Share2 className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle
              id="recording-share-title"
              className="text-base font-semibold"
            >
              Share recording
            </DialogTitle>
            <DialogDescription
              className="mt-0.5 truncate text-xs font-medium"
              title={recording.title}
            >
              {recording.title}
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className={`${dialogLayout.body} space-y-5 p-1`}>
          {isOwner && (
            <>
              <RecordingShareForm
                ownerId={recording.ownerId}
                sharedUserIds={
                  new Set(
                    permissions.data?.map((permission) => permission.userId),
                  )
                }
                disabled={
                  action.isPending ||
                  !permissions.isSuccess ||
                  recording.status !== "COMPLETED"
                }
                granting={
                  action.isPending &&
                  pendingAction?.startsWith("grant:") === true
                }
                canDownload={canDownload}
                onPermissionChange={setCanDownload}
                onGrant={(id) =>
                  runAction(`grant:${id}`, () =>
                    recordingApi.share(recording.id, id, canDownload),
                  )
                }
              />
              <MeetingButton
                tone="outline"
                className="w-full"
                loading={action.isPending && pendingAction === "participants"}
                disabled={action.isPending || recording.status !== "COMPLETED"}
                onClick={() =>
                  updateAccess("participants", () =>
                    recordingApi.shareParticipants(recording.id, canDownload),
                  )
                }
              >
                <UsersRound className="size-4" aria-hidden="true" />
                Share with meeting attendees
              </MeetingButton>
            </>
          )}
          <RecordingAccessList
            isOwner={isOwner}
            ownerProfile={
              isOwner
                ? {
                    fullName: account.fullName,
                    email: account.email,
                    avatarUrl: account.avatarUrl,
                  }
                : undefined
            }
            permissions={permissions.data}
            loading={permissions.isLoading}
            error={permissions.isError}
            disabled={action.isPending}
            pendingAction={pendingAction}
            onPermissionChange={(id, value) =>
              updateAccess(`download:${id}`, () =>
                recordingApi.share(recording.id, id, value),
              )
            }
            onRemove={(id) =>
              updateAccess(`revoke:${id}`, () =>
                recordingApi.revoke(recording.id, id),
              )
            }
          />
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              Private by default. Access includes the recording and its saved AI
              summary. Previously issued playback links may remain valid for up
              to five minutes.
            </span>
          </p>
        </div>
        <DialogFooter className="mt-5 border-0 p-0">
          <MeetingButton tone="outline" onClick={onClose}>
            <Check className="size-4" aria-hidden="true" />
            Done
          </MeetingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
