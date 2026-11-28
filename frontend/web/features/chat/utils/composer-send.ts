export function createComposerSendController(contextKey?: string | null) {
  let pending = false;
  let active = true;
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of listeners) listener(); };

  return {
    contextKey,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => pending,
    isActive: () => active,
    activate() { active = true; },
    dispose() { active = false; listeners.clear(); },
    async run(send: () => Promise<boolean>, confirmed: () => void): Promise<boolean> {
      if (pending || !active) return false;
      pending = true;
      notify();
      try {
        const sent = await send();
        if (sent && active) confirmed();
        return sent;
      } finally {
        pending = false;
        if (active) notify();
      }
    },
  };
}
