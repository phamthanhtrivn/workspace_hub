"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAttendeeSearch } from "@/features/calendar/hooks/use-calendar-users";
import { useAppSelector } from "@/store/store";
import { recordingApi } from "../../api/meeting-recording.api";
import { recordingErrorMessage } from "../../utils/recording-errors";
import type { MeetingRecording } from "../../types/meeting-recording.types";
import { MeetingButton, MeetingInput } from "../ui/meeting-form-controls";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingState } from "@/components/ui/loading-state";


export function MeetingRecordingShareDialog({
  recording,
  onClose,
}: {
  recording: MeetingRecording;
  onClose: () => void;
}) {
  const userId = useAppSelector((state) => state.auth.userId);
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [canDownload, setCanDownload] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const users = useAttendeeSearch(search);
  const key = ["meeting-recordings", userId, "permissions", recording.id];
  const permissions = useQuery({
    queryKey: key,
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
    onError: (error) => toast.error(recordingErrorMessage(error)),
  });
  const runAction = (key: string, operation: () => Promise<unknown>) => {
    setPendingAction(key);
    action.mutate(operation, { onSettled: () => setPendingAction(null) });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={`${dialogLayout.surface} max-h-[85dvh] overflow-y-auto p-6`}
        aria-labelledby="recording-share-title"
      >
        <DialogTitle id="recording-share-title">Share recording</DialogTitle>
        <DialogDescription className="mt-2">
          Private by default. Give accounts permission to watch or download.
          Previously issued links expire within five minutes.
        </DialogDescription>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <Checkbox

            checked={canDownload}
            onCheckedChange={nextChecked => setCanDownload(nextChecked)}
          />
          Allow download when granting access
        </label>
        <MeetingButton
          loading={action.isPending && pendingAction === "participants"}
          className="mt-4"
          tone="secondary"
          disabled={action.isPending || recording.status !== "COMPLETED"}
          onClick={() =>
            runAction("participants", () =>
              recordingApi.shareParticipants(recording.id, canDownload),
            )
          }
        >
          Share with meeting attendees
        </MeetingButton>
        <label className="mt-5 block text-sm">
          Find an account by name or email
          <MeetingInput
            className="mt-2"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or email"
          />
        </label>
        {users.isFetching && (
          <LoadingState label="Searching…" className="mt-2 text-sm text-muted-foreground" />
        )}
        {users.isError && (
          <p role="alert" className="mt-2 text-sm text-destructive-content">
            Could not search accounts.
          </p>
        )}
        {(users.data ?? [])
          .filter((user) => user.id !== recording.ownerId)
          .map((user) => (
            <div
              key={user.id}
              className="mt-2 flex items-center justify-between gap-2 border-b py-2"
            >
              <span className="min-w-0 truncate text-sm">
                {user.fullName || user.email}
              </span>
              <MeetingButton
                tone="outline"
                loading={action.isPending && pendingAction === `grant:${user.id}`}
                disabled={action.isPending}
                onClick={() =>
                  runAction(`grant:${user.id}`, () =>
                    recordingApi.share(recording.id, user.id, canDownload),
                  )
                }
              >
                Grant access
              </MeetingButton>
            </div>
          ))}
        <h3 className="mt-6 text-sm font-semibold">Accounts with access</h3>
        {permissions.isError ? (
          <p role="alert">Could not load permissions.</p>
        ) : permissions.isLoading ? (
          <LoadingState label="Loading…" />
        ) : !permissions.data?.length ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Only you can access this recording.
          </p>
        ) : (
          permissions.data.map((permission) => (
            <div
              key={permission.userId}
              className="mt-2 flex flex-wrap items-center justify-between gap-2 border-b py-2"
            >
              <span className="min-w-0 truncate text-sm">
                {permission.profile?.fullName ||
                  permission.profile?.email ||
                  "Shared account"}
              </span>
              <div className="flex gap-2">
                <MeetingButton
                  tone="outline"
                  loading={action.isPending && pendingAction === `download:${permission.userId}`}
                  disabled={action.isPending}
                  onClick={() =>
                    runAction(`download:${permission.userId}`, () =>
                      recordingApi.share(
                        recording.id,
                        permission.userId,
                        !permission.canDownload,
                      ),
                    )
                  }
                >
                  {permission.canDownload
                    ? "Disable download"
                    : "Allow download"}
                </MeetingButton>
                <MeetingButton
                  tone="danger"
                  loading={action.isPending && pendingAction === `revoke:${permission.userId}`}
                  disabled={action.isPending}
                  onClick={() =>
                    runAction(`revoke:${permission.userId}`, () =>
                      recordingApi.revoke(recording.id, permission.userId),
                    )
                  }
                >
                  Revoke
                </MeetingButton>
              </div>
            </div>
          ))
        )}
      </DialogContent>
    </Dialog>
  );
}
