import type { RecordingLayout } from "../types/meeting-recording.types";

/** A recording has its own stage, independent of attendees' pins and UI. */
export function selectRecordingStage<
  T extends { participant: { identity: string } },
>(layout: RecordingLayout, cameras: T[], screens: T[], speakerId?: string) {
  const speaker =
    cameras.find((track) => track.participant.identity === speakerId) ??
    cameras[0];
  const screen = screens[0];
  if (screen)
    return {
      main: screen,
      tiles:
        layout === "screen"
          ? []
          : layout === "grid"
            ? (speaker
                ? [speaker, ...cameras.filter((track) => track !== speaker)]
                : cameras
              ).slice(0, 5)
            : speaker
              ? [speaker]
              : [],
      screen: true,
    };
  if (layout === "screen") return { main: undefined, tiles: [], screen: true };
  if (layout === "grid")
    return { main: undefined, tiles: cameras.slice(0, 25), screen: false };
  return {
    main: speaker,
    tiles: cameras.filter((track) => track !== speaker).slice(0, 5),
    screen: false,
  };
}
