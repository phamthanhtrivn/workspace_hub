"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useRoomContext,
  useConnectionState,
  useParticipants,
} from "@livekit/components-react";
import {
  ConnectionState,
  RoomEvent,
  type RemoteParticipant,
} from "livekit-client";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { captionsApi } from "../api/meeting-captions.api";
import {
  CAPTION_TOPIC,
  type MeetingCaption,
} from "../types/meeting-captions.types";
import { parseCaption, updateCaptions } from "../utils/meeting-captions";

export function useMeetingCaptions(joinToken: string, meetingId: string) {
  const room = useRoomContext();
  const connection = useConnectionState();
  const participants = useParticipants();
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [pending, setPending] = useState(false);
  const [captions, setCaptions] = useState<MeetingCaption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const enabledRef = useRef(false);
  const generation = useRef(0);
  const workerIdentity = `captions:${meetingId}`;
  const active = participants.some(
    (participant) => participant.identity === workerIdentity,
  );

  useEffect(() => {
    if (connection !== ConnectionState.Connected) return;
    let cancelled = false;
    void captionsApi
      .status(joinToken)
      .then((status) => {
        if (!cancelled) setAvailable(status.available);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connection, joinToken]);

  const receive = useCallback(
    (
      payload: Uint8Array,
      participant?: RemoteParticipant,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (
        !enabledRef.current ||
        participant?.identity !== workerIdentity ||
        topic !== CAPTION_TOPIC
      )
        return;
      const next = parseCaption(payload, Date.now());
      if (next) {
        setError(null);
        setCaptions((current) => updateCaptions(current, next));
        return;
      }
      if (payload.byteLength > 8192) return;
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === "clear" && typeof data.speakerId === "string")
          setCaptions((current) =>
            current.filter((caption) => caption.speakerId !== data.speakerId),
          );
        if (data.type === "error" && typeof data.message === "string")
          setError(data.message.slice(0, 300));
      } catch {
        /* Ignore malformed data packets. */
      }
    },
    [workerIdentity],
  );

  useEffect(() => {
    room.on(RoomEvent.DataReceived, receive);
    return () => {
      room.off(RoomEvent.DataReceived, receive);
    };
  }, [room, receive]);

  useEffect(() => {
    if (!enabled || connection !== ConnectionState.Connected) return;
    const refresh = () => {
      void captionsApi
        .start(joinToken)
        .catch(() =>
          setError("Captions disconnected. Turn CC off and on to retry."),
        );
    };
    refresh();
    const renew = window.setInterval(refresh, 20_000);
    const expire = window.setInterval(() => {
      setCaptions((current) => {
        const visible = current.filter(
          (caption) => Date.now() - caption.receivedAt < 12_000,
        );
        return visible.length === current.length ? current : visible;
      });
    }, 1000);
    return () => {
      window.clearInterval(renew);
      window.clearInterval(expire);
    };
  }, [enabled, connection, joinToken]);

  useEffect(
    () => () => {
      generation.current += 1;
      if (enabledRef.current)
        void captionsApi.release(joinToken).catch(() => undefined);
      enabledRef.current = false;
    },
    [joinToken],
  );

  const toggle = useCallback(async () => {
    if (pending) return;
    if (enabledRef.current) {
      generation.current += 1;
      enabledRef.current = false;
      setEnabled(false);
      setCaptions([]);
      setError(null);
      void captionsApi.release(joinToken).catch(() => undefined);
      return;
    }
    const version = ++generation.current;
    setPending(true);
    setError(null);
    try {
      await captionsApi.start(joinToken);
      if (generation.current !== version) {
        void captionsApi.release(joinToken).catch(() => undefined);
        return;
      }
      enabledRef.current = true;
      setEnabled(true);
    } catch (failure) {
      const message =
        isAxiosError(failure) &&
        typeof failure.response?.data?.message === "string"
          ? failure.response.data.message
          : "Could not start live captions. Please try again.";
      toast.error(message);
    } finally {
      if (generation.current === version) setPending(false);
    }
  }, [pending, joinToken]);

  return { enabled, available, pending, captions, error, active, toggle };
}
