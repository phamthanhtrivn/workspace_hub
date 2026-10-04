import { Button } from "@/components/ui/button";
import { AUDIO_OFF_TRACK, type AmbientTrack, type AmbientTrackId, type PomodoroAudio } from "../types/ambient";
import { POMODORO_AUDIO_MESSAGES } from "../constants/pomodoro-audio";
import { PomodoroAudioIcon } from "./pomodoro-audio-icon";
import { cn } from "@/lib/utils";

interface PomodoroAudioTrackListProps {
  audios: PomodoroAudio[];
  currentTrackId: AmbientTrackId;
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  onSelectTrack: (trackId: AmbientTrackId) => void;
}

function AudioTrackButton({ track, selected, onSelectTrack }: {
  track: AmbientTrack;
  selected: boolean;
  onSelectTrack: (trackId: AmbientTrackId) => void;
}) {
  return (
    <Button variant="ghost" type="button" onClick={() => onSelectTrack(track.id)} aria-pressed={selected}
      className={cn("h-auto justify-start whitespace-normal flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-all disabled:cursor-not-allowed",
        selected ? "bg-gradient-to-r from-blue-50 to-indigo-50/60 text-[var(--color-primary,#1C4D8D)] font-semibold shadow-2xs"
          : "text-slate-700 hover:bg-slate-50")}>
      <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg",
        selected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500")}>
        <PomodoroAudioIcon name={track.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{track.name}</div>
        <div className="truncate text-[10px] text-slate-400">{track.description}</div>
      </div>
      {selected && <span className="size-2 shrink-0 rounded-full bg-blue-600" />}
    </Button>
  );
}

export function PomodoroAudioTrackList({ audios, currentTrackId, isLoading, hasError, onRetry, onSelectTrack }: PomodoroAudioTrackListProps) {
  return (
    <div className="my-3 max-h-56 space-y-1 overflow-y-auto pr-1">
      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Audio library</div>
      <AudioTrackButton track={AUDIO_OFF_TRACK} selected={currentTrackId === "none"} onSelectTrack={onSelectTrack} />
      {isLoading && <p role="status" className="px-2 py-2 text-xs text-slate-500">{POMODORO_AUDIO_MESSAGES.loading}</p>}
      {hasError && (
        <div role="status" className="px-2 py-2 text-xs text-amber-700">
          <p>{POMODORO_AUDIO_MESSAGES.loadError}</p>
          <Button variant="ghost" type="button" onClick={onRetry} className="mt-1 cursor-pointer font-semibold underline disabled:cursor-not-allowed">{POMODORO_AUDIO_MESSAGES.retry}</Button>
        </div>
      )}
      {!isLoading && !hasError && audios.length === 0 && (
        <p role="status" className="px-2 py-2 text-xs text-slate-500">{POMODORO_AUDIO_MESSAGES.empty}</p>
      )}
      {audios.map((audio) => <AudioTrackButton key={audio.id} track={audio}
        selected={audio.id === currentTrackId} onSelectTrack={onSelectTrack} />)}
    </div>
  );
}
