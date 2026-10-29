import { visibleSnapshot } from "../../common/evidence-policy";
import type { Actor, Snapshot, Source } from "../../common/types";
import { authorizeSources } from "../../infrastructure/integrations/document.client";

export function createChatAuthorization(options: {
  actor: Actor;
  sources: Source[];
  snapshot: Snapshot[];
  loadSources: () => Promise<Source[]>;
  signal: AbortSignal;
}) {
  let pending: Promise<void> | undefined;
  async function check() {
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
  }
  return () => {
    pending ??= check().finally(() => {
      pending = undefined;
    });
    return pending;
  };
}
