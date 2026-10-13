"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";
import { LocalVideoTrack, Track } from "livekit-client";
import { recordingApi } from "../api/meeting-recording.api";

type CaptureTrack = MediaStreamTrack & {
  getCaptureHandle?: () => { handle: string; origin?: string } | null;
};
type CaptureDevices = MediaDevices & {
  setCaptureHandleConfig?: (config: {
    handle: string;
    exposeOrigin?: boolean;
    permittedOrigins?: string[];
  }) => void;
};

export function useMeetingTabCapture(joinToken: string, onEnded: () => void) {
  const room = useRoomContext();
  const trackRef = useRef<LocalVideoTrack | null>(null);
  const handleRef = useRef("");
  const endedRef = useRef(onEnded);
  useEffect(() => { endedRef.current = onEnded; }, [onEnded]);

  const release = useCallback(async () => {
    const track = trackRef.current;
    trackRef.current = null;
    if (!track) return;
    track.stop();
    await room.localParticipant.unpublishTrack(track).catch(() => undefined);
    await recordingApi.capturePermission(joinToken, false).catch(() => undefined);
  }, [joinToken, room]);

  useEffect(() => {
    const devices = navigator.mediaDevices as CaptureDevices | undefined;
    handleRef.current = crypto.randomUUID();
    devices?.setCaptureHandleConfig?.({
      handle: handleRef.current,
      exposeOrigin: true,
      permittedOrigins: [window.location.origin],
    });
    return () => {
      if (trackRef.current) endedRef.current();
      void release();
      devices?.setCaptureHandleConfig?.({ handle: "", permittedOrigins: [] });
    };
  }, [release]);

  const capture = useCallback(async () => {
    const devices = navigator.mediaDevices as CaptureDevices | undefined;
    if (!devices?.setCaptureHandleConfig)
      throw new Error("Record this meeting tab using desktop Chrome or Edge.");
    const stream = await devices.getDisplayMedia({
      video: { displaySurface: "browser", frameRate: 30 },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      surfaceSwitching: "exclude",
      monitorTypeSurfaces: "exclude",
    } as DisplayMediaStreamOptions);
    const mediaTrack = stream.getVideoTracks()[0] as CaptureTrack | undefined;
    const handle = mediaTrack?.getCaptureHandle?.();
    if (!mediaTrack || mediaTrack.getSettings().displaySurface !== "browser" ||
        handle?.handle !== handleRef.current || handle.origin !== window.location.origin) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("Choose this Meeting tab to record the application.");
    }
    const track = new LocalVideoTrack(mediaTrack);
    track.source = Track.Source.Unknown;
    trackRef.current = track;
    mediaTrack.addEventListener("ended", () => {
      if (trackRef.current === track) { endedRef.current(); void release(); }
    }, { once: true });
    mediaTrack.addEventListener("capturehandlechange", () => {
      const current = mediaTrack.getCaptureHandle?.();
      if (trackRef.current === track && (current?.handle !== handleRef.current || current.origin !== window.location.origin))
        { endedRef.current(); void release(); }
    });
    try {
      await recordingApi.capturePermission(joinToken, true);
      const publication = await room.localParticipant.publishTrack(track, {
        name: "meeting-tab-recording",
        source: Track.Source.Unknown,
        simulcast: false,
      });
      return publication.trackSid;
    } catch (error) {
      await release();
      throw error;
    }
  }, [joinToken, release, room]);

  return { capture, release };
}
