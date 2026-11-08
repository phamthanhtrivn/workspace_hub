"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Languages,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useInView } from "react-intersection-observer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useStorageUrl } from "@/features/storage/hooks/use-storage-url";
import { VOICE, VOICE_LABELS } from "../../constants/voice.constants";
import { useVoiceTranscript } from "../../hooks/message/useVoiceTranscript";
import { useVoiceWaveform } from "../../hooks/message/useVoiceWaveform";
import { formatVoiceTime } from "../../utils/voice-audio";
import type { ChatMediaResponse } from "../../types/chat.types";
import type { VoiceChatType } from "../../types/voice.types";

export function VoiceMessagePlayer({
  media,
  isMe,
  chatType,
}: {
  media: ChatMediaResponse;
  isMe: boolean;
  chatType?: VoiceChatType;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const id = useId();
  const access = useStorageUrl(media.fileUrl);
  const [playerRef, inView] = useInView({
    triggerOnce: true,
    rootMargin: "100px",
  });
  const waveform = useVoiceWaveform(
    media.id,
    media.fileUrl,
    inView && media.sizeBytes <= VOICE.waveformBytes,
  );
  const transcript = useVoiceTranscript(media.id, chatType);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const playbackFailed = failed || (!access.isLoading && !access.url);
  const [position, setPosition] = useState(0);
  const [metadataDuration, setMetadataDuration] = useState(0);
  const duration =
    Number.isFinite(metadataDuration) && metadataDuration > 0
      ? metadataDuration
      : (waveform.data?.duration ?? 0);
  const progress = duration ? Math.min(1, position / duration) : 0;
  useEffect(() => {
    const pauseOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id)
        audioRef.current?.pause();
    };
    window.addEventListener(VOICE.playEvent, pauseOther);
    return () => window.removeEventListener(VOICE.playEvent, pauseOther);
  }, [id]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !access.url) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      await audio.play();
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };
  const retry = () => {
    setFailed(false);
    access.refresh();
    audioRef.current?.load();
  };
  const transcriptLabel = transcript.creating
    ? VOICE_LABELS.working
    : transcript.failed
      ? VOICE_LABELS.retry
      : transcript.expanded
        ? VOICE_LABELS.hide
        : transcript.data?.status === "COMPLETED"
          ? VOICE_LABELS.show
          : VOICE_LABELS.convert;

  return (
    <div
      ref={playerRef}
      className={cn(
        "w-72 max-w-full min-w-0 rounded-panel border border-border p-3 text-left",
        isMe ? "bg-primary-soft" : "bg-muted",
      )}
    >
      <audio
        ref={audioRef}
        src={access.url}
        preload="metadata"
        className="hidden"
        onLoadStart={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => {
          setLoading(false);
          setPlaying(true);
          window.dispatchEvent(
            new CustomEvent(VOICE.playEvent, { detail: id }),
          );
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPosition(0);
        }}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          setMetadataDuration(event.currentTarget.duration);
          setLoading(false);
        }}
        onError={() => {
          setLoading(false);
          if (!access.refresh()) setFailed(true);
        }}
      />
      <div className="flex min-w-0 items-center gap-2.5">
        <Button
          type="button"
          size="icon"
          className="size-10 shrink-0 rounded-full"
          onClick={() => void togglePlay()}
          aria-label={playing ? VOICE_LABELS.pause : VOICE_LABELS.play}
          disabled={!access.url || playbackFailed}
        >
          {loading || access.isLoading ? (
            <Spinner tone="inherit" />
          ) : playing ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
        </Button>
        <div className="min-w-0 flex-1">
          <div className="relative h-7 w-full">
            {waveform.data?.peaks.length ? (
              <svg
                viewBox="0 0 192 28"
                preserveAspectRatio="none"
                className="h-full w-full text-muted-foreground/40"
                aria-hidden="true"
              >
                <defs>
                  <clipPath id={`${id}-progress`}>
                    <rect width={192 * progress} height="28" />
                  </clipPath>
                </defs>
                <g>
                  {waveform.data.peaks.map((peak, index) => (
                    <rect
                      key={index}
                      x={index * 4}
                      y={14 - Math.max(1, peak * 12)}
                      width="2"
                      height={Math.max(2, peak * 24)}
                      rx="1"
                      fill="currentColor"
                    />
                  ))}
                </g>
                <g
                  clipPath={`url(#${id}-progress)`}
                  className="text-foreground"
                >
                  {waveform.data.peaks.map((peak, index) => (
                    <rect
                      key={index}
                      x={index * 4}
                      y={14 - Math.max(1, peak * 12)}
                      width="2"
                      height={Math.max(2, peak * 24)}
                      rx="1"
                      fill="currentColor"
                    />
                  ))}
                </g>
              </svg>
            ) : (
              <div className="absolute inset-x-0 top-3 h-1 rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            )}
            <Input
              unstyled
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={Math.min(position, duration || 1)}
              disabled={!duration || failed}
              aria-label={VOICE_LABELS.seek}
              aria-valuetext={`${formatVoiceTime(position)} / ${formatVoiceTime(duration)}`}
              onChange={(event) => {
                const seconds = Number(event.target.value);
                if (audioRef.current) audioRef.current.currentTime = seconds;
                setPosition(seconds);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 focus-visible:opacity-100 disabled:cursor-default"
            />
          </div>
          <span className="block text-xs tabular-nums text-muted-foreground">
            {formatVoiceTime(playing || position ? position : duration)}
          </span>
        </div>
        {transcript.enabled && (
          <Button
            type="button"
            variant={transcript.expanded ? "info-soft" : "ghost"}
            size="icon-sm"
            className="shrink-0"
            aria-label={transcriptLabel}
            title={transcriptLabel}
            aria-expanded={transcript.expanded}
            aria-controls={transcript.expanded ? `${id}-transcript` : undefined}
            disabled={transcript.creating}
            onClick={transcript.toggle}
          >
            {transcript.busy ? (
              <Spinner />
            ) : transcript.expanded ? (
              <ChevronUp />
            ) : transcript.data?.status === "COMPLETED" ? (
              <ChevronDown />
            ) : (
              <Languages />
            )}
          </Button>
        )}
      </div>
      {playbackFailed && (
        <div className="mt-2 flex items-center gap-2 text-xs text-destructive-content">
          <span>{VOICE_LABELS.playbackFailed}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={VOICE_LABELS.retryPlayback}
            onClick={retry}
          >
            <RotateCcw />
          </Button>
        </div>
      )}
      {transcript.expanded && (
        <section
          id={`${id}-transcript`}
          aria-label={VOICE_LABELS.transcript}
          className="mt-3 border-t border-border pt-2 text-sm text-foreground"
          aria-busy={transcript.busy}
        >
          {transcript.busy ? (
            <p
              role="status"
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <Spinner size={14} />
              {VOICE_LABELS.working}
            </p>
          ) : transcript.failed ? (
            <p role="alert" className="text-xs text-destructive-content">
              {transcript.data?.error || VOICE_LABELS.failed}
            </p>
          ) : (
            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {transcript.data?.text || VOICE_LABELS.empty}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
