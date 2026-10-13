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
  const switching = useRef(false);
  const renewing = useRef(false);
  const autoRetries = useRef(0);
  const [playback, setPlayback] = useState<{
    url: string;
    expiresAt: string;
  } | null>(null);
  const [playbackIssue, setPlaybackIssue] = useState(false);
  const query = useQuery({
    queryKey: ["meeting-recordings", userId, "playback", recording.id],
    queryFn: () => recordingApi.url(recording.id),
    staleTime: 0,
    retry: false,
  });
  const current = playback ?? query.data;
  const { refetch } = query;
  const refresh = useCallback(async () => {
    if (renewing.current) return;
    renewing.current = true;
    position.current = video.current?.currentTime || position.current;
    shouldResume.current =
      shouldResume.current || Boolean(video.current && !video.current.paused);
    try {
      let access = query.data;
      if (
        !access ||
        access.url === current?.url ||
        Date.parse(access.expiresAt) <= Date.now()
      ) {
        const result = await refetch();
        if (result.isError || !result.data) {
          setPlaybackIssue(true);
          return;
        }
        access = result.data;
      }
      switching.current = true;
      setPlayback(access);
      setPlaybackIssue(false);
      if (access.url === current?.url) video.current?.load();
    } finally {
      renewing.current = false;
    }
  }, [query.data, current?.url, refetch]);
  useEffect(() => {
    if (!query.data) return;
    const remaining = Date.parse(query.data.expiresAt) - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(
      () => {
        void refetch();
      },
      remaining > 30_000 ? remaining - 15_000 : Math.max(1000, remaining / 2),
    );
    return () => window.clearTimeout(timer);
  }, [query.data, refetch]);

  const renewExpiredPlayback = () => {
    if (current && Date.parse(current.expiresAt) <= Date.now()) void refresh();
  };

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
            <MeetingButton className="mt-3" onClick={() => void refresh()}>
              Try again
            </MeetingButton>
          </div>
        ) : (
          query.data && (
            <>
              <video
                ref={video}
                src={current?.url}
                controls
                playsInline
                preload="metadata"
                className="mt-4 aspect-video w-full rounded-md bg-black"
                onLoadedMetadata={() => {
                  if (video.current) {
                    if (!playback && query.data) setPlayback(query.data);
                    video.current.currentTime = position.current;
                    switching.current = false;
                    if (shouldResume.current)
                      void video.current.play().catch(() => {});
                  }
                }}
                onTimeUpdate={() => {
                  if (!switching.current)
                    position.current = video.current?.currentTime ?? 0;
                }}
                onPlay={() => {
                  shouldResume.current = true;
                  renewExpiredPlayback();
                }}
                onPlaying={() => {
                  autoRetries.current = 0;
                }}
                onPause={() => {
                  if (!switching.current && !video.current?.error)
                    shouldResume.current = false;
                }}
                onSeeking={renewExpiredPlayback}
                onError={() => {
                  if (autoRetries.current < 1) {
                    autoRetries.current += 1;
                    void refresh();
                  } else setPlaybackIssue(true);
                }}
              />
              {playbackIssue && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Playback could not continue. Retry to refresh access.
                  </p>
                  <MeetingButton
                    disabled={query.isFetching}
                    onClick={() => {
                      autoRetries.current = 0;
                      void refresh();
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
