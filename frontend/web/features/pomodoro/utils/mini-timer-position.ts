export interface MiniTimerPosition { x: number; y: number }

export const MINI_TIMER_DRAG_SETTINGS = { edgeGap: 12, activationDistance: 5 } as const;

export function clampMiniTimerPosition(position: MiniTimerPosition, size: { width: number; height: number }, viewport: { width: number; height: number }): MiniTimerPosition {
  const gap = MINI_TIMER_DRAG_SETTINGS.edgeGap;
  return {
    x: Math.max(gap, Math.min(position.x, Math.max(gap, viewport.width - size.width - gap))),
    y: Math.max(gap, Math.min(position.y, Math.max(gap, viewport.height - size.height - gap))),
  };
}
