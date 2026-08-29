import { Loader2, PhoneOff } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface MeetingExitControlsProps {
  canModerate: boolean;
  isEnding: boolean;
  isLeaving: boolean;
  isRoomActionPending: boolean;
  onEndMeeting: () => void;
  onLeaveMeeting: () => void;
}

export function MeetingExitControls({
  canModerate,
  isEnding,
  isLeaving,
  isRoomActionPending,
  onEndMeeting,
  onLeaveMeeting,
}: MeetingExitControlsProps) {
  const intl = useAppIntl();

  return (
    <>
      <button
        type="button"
        disabled={isRoomActionPending}
        onClick={onLeaveMeeting}
        className="flex h-10 items-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-black text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLeaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <PhoneOff className="h-4 w-4" />
        )}
        {intl.formatMessage({
          id: isLeaving ? "meeting.room.leaving" : "meeting.room.leave",
        })}
      </button>

      {canModerate ? (
        <button
          type="button"
          disabled={isRoomActionPending}
          onClick={onEndMeeting}
          className="flex h-10 items-center gap-2 rounded-lg bg-red-500/45 px-4 text-sm font-black text-white hover:bg-red-500/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isEnding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {intl.formatMessage({
            id: isEnding
              ? "meeting.room.endingForEveryone"
              : "meeting.room.endForEveryone",
          })}
        </button>
      ) : null}
    </>
  );
}
