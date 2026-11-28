import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { meetingKeys } from "../types/meeting.query-keys";

export function clearMeetingRoomQueries(
  client: QueryClient,
  joinToken: string,
  userId: string | null,
): void {
  const roots: QueryKey[] = [
    meetingKeys.participantsRoot(joinToken),
    meetingKeys.access(joinToken),
    meetingKeys.room(joinToken),
    meetingKeys.messages(joinToken),
    meetingKeys.joinRequestsRoot(joinToken),
    meetingKeys.participantViewPreferences(joinToken),
    meetingKeys.participantHandStates(joinToken),
    ["meeting-recording-status", userId, joinToken],
  ];
  const predicate = (query: { queryKey: QueryKey }) =>
    roots.some((root) =>
      root.every((value, index) => value === query.queryKey[index]),
    );
  void client.cancelQueries({ predicate });
  client.removeQueries({ predicate });
}
