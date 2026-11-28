import type { TaskReference } from "../types";

export function taskHref(source: TaskReference) {
  if (source.kind === "project" && source.projectId)
    return "/projects/" + source.projectId + "?taskId=" + source.id;
  const timestamp = /[?&]t=(\d+)/.exec(source.url)?.[1];

  return (
    "/calendar?eventId=" + source.id + (timestamp ? "&t=" + timestamp : "")
  );
}
