import type { MeetingCaption } from "../../types/meeting-captions.types";

export function MeetingCaptions({
  captions,
  error,
}: {
  captions: MeetingCaption[];
  error: string | null;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex justify-center sm:bottom-5">
      <div
        role="log"
        aria-label="Live captions"
        aria-live="polite"
        aria-relevant="text"
        className="max-h-40 w-full max-w-3xl overflow-y-auto rounded-xl border border-white/15 bg-black/85 px-4 py-3 text-sm text-white shadow-xl sm:text-base"
      >
        {error ? (
          <p role="status" className="text-amber-200">
            {error}
          </p>
        ) : captions.length ? (
          captions.map((caption) => (
            <p key={caption.trackId} className="mt-1 break-words first:mt-0">
              <span className="mr-2 font-bold text-sky-200">
                {caption.speakerName}:
              </span>
              {caption.text}
            </p>
          ))
        ) : (
          <p className="text-slate-300">
            Vietnamese captions are on. Waiting for speech…
          </p>
        )}
      </div>
    </div>
  );
}
