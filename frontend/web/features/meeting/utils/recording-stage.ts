import type { RecordingLayout } from "../types/meeting-recording.types";

/** A recording has its own stage, independent of attendees' pins and UI. */
export function selectRecordingStage<
  T extends { participant: { identity: string } },
>(layout: RecordingLayout, cameras: T[], screens: T[], speakerId?: string) {
  if (layout === "screen") return { main: screens[0], tiles: [], screen: true };
  if (layout === "grid")
    return { main: undefined, tiles: cameras.slice(0, 25), screen: false };
  const speaker =
    cameras.find((track) => track.participant.identity === speakerId) ??
    cameras[0];
  const tiles: T[] = [];
  for (const track of cameras) {
    if (track === speaker) continue;
    tiles.push(track);
    if (tiles.length === 5) break;
  }
  return {
    main: speaker,
    tiles,
    screen: false,
  };
}
