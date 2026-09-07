import { useEffect, useRef } from "react";

type FrameCallback = (dtSeconds: number, nowMs: number) => void;

/** Clamp huge deltas (e.g. after the tab was backgrounded) so physics don't jump. */
const MAX_DT_SECONDS = 0.1;

/**
 * Runs `callback` once per animation frame while `isActive` is true.
 * Generic and game-agnostic: both the balloon simulation and the hand
 * cursor/trail renderer use this same hook independently.
 */
export function useGameLoop(callback: FrameCallback, isActive: boolean): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!isActive) return;

    let rafId = 0;
    let lastTime: number | null = null;

    const tick = (now: number) => {
      if (lastTime === null) lastTime = now;
      const dtSeconds = Math.min((now - lastTime) / 1000, MAX_DT_SECONDS);
      lastTime = now;
      callbackRef.current(dtSeconds, now);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isActive]);
}
