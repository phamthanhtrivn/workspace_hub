"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { recordingApi } from "../../api/meeting-recording.api";
import type { MeetingRecording } from "../../types/meeting-recording.types";
import { MeetingButton } from "../ui/meeting-form-controls";

export function MeetingRecordingPlayer({
  recording,
  onClose,
}: {
  recording: MeetingRecording;
  onClose: () => void;
}) {
  const userId = useAppSelector((state) => state.auth.userId);
  const video = useRef<HTMLVideoElement>(null);
  const position = useRef(0);
  const shouldResume = useRef(false);
  const [expired, setExpired] = useState(false);
  const query = useQuery({
    queryKey: ["meeting-recordings", userId, "playback", recording.id],
    queryFn: () => recordingApi.url(recording.id),
    staleTime: 0,
    retry: false,
  });
  const refresh = useCallback(() => {
    position.current = video.current?.currentTime ?? position.current;
    shouldResume.current = video.current ? !video.current.paused : false;
    void query.refetch();
  }, [query]);
  useEffect(() => {
    if (!query.data) return;
    const timer = window.setTimeout(
      () => setExpired(true),
      Math.max(
        0,
        new Date(query.data.expiresAt).getTime() - Date.now() - 15_000,
      ),
    );
    return () => window.clearTimeout(timer);
  }, [query.data]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-w-4xl p-5"
        aria-labelledby="recording-player-title"
      >
        <DialogTitle id="recording-player-title" className="pr-10">
          {recording.title}
        </DialogTitle>
        {query.isLoading ? (
          <p className="py-12 text-center">Loading recording…</p>
        ) : query.isError ? (
          <div role="alert" className="py-8">
            <p>Recording unavailable or access has been revoked.</p>
            <MeetingButton className="mt-3" onClick={refresh}>
              Try again
            </MeetingButton>
          </div>
        ) : (
          query.data && (
            <>
              <video
                ref={video}
                src={query.data.url}
                controls
                playsInline
                preload="metadata"
                className="mt-4 aspect-video w-full rounded-md bg-black"
                onLoadedMetadata={() => {
                  if (video.current) {
                    video.current.currentTime = position.current;
                    if (shouldResume.current)
                      void video.current.play().catch(() => {});
                  }
                }}
                onTimeUpdate={() => {
                  position.current = video.current?.currentTime ?? 0;
                }}
                onError={() => setExpired(true)}
              />
              {expired && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Refresh video access if playback stops.
                  </p>
                  <MeetingButton
                    disabled={query.isFetching}
                    onClick={() => {
                      setExpired(false);
                      refresh();
                    }}
                  >
                    Refresh access
                  </MeetingButton>
                </div>
              )}
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
