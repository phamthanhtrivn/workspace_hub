import { visibleSnapshot } from "./evidence-policy";
import { singleFlight } from "./single-flight";
import type { Actor, Snapshot, Source } from "./types";
import { authorizeSources } from "../infrastructure/integrations/document.client";

/**
 * Re-checks that the selected sources are unchanged and still readable by the
 * actor. Concurrent callers (pollers and inline checkpoints) share one
 * in-flight check instead of each calling the Document service.
 */
export function createSourceAuthorization(options: {
  actor: Actor;
  sources: Source[];
  snapshot: Snapshot[];
  loadSources: () => Promise<Source[]>;
  signal: AbortSignal;
}) {
  return singleFlight(async () => {
    options.signal.throwIfAborted();
    const current = await options.loadSources();
    options.signal.throwIfAborted();
    if (!visibleSnapshot(options.snapshot, current))
      throw new Error("Nguồn đã thay đổi");
    await authorizeSources(
      options.actor,
      options.sources,
      false,
      options.signal,
    );
    options.signal.throwIfAborted();
  });
}
