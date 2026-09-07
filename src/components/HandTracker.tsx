import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { TrackedPoint } from "../game/types";
import { useGameLoop } from "../hooks/useGameLoop";
import { hexToRgba } from "../utils/color";

interface HandTrackerProps {
  fingertipsRef: RefObject<TrackedPoint[]>;
  active: boolean;
  handsVisible: boolean;
}

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

const TRAIL_DURATION_MS = 260;
const HAND_COLORS = ["#fdb0c0", "#affded"];

/**
 * Purely a *visualization* of tracked hands (glowing cursor + fading trail).
 * Collision detection lives in game/engine.ts and reads the same
 * `fingertipsRef` independently — this component never touches game state.
 */
export function HandTracker({ fingertipsRef, active, handsVisible }: HandTrackerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailsByHandRef = useRef<TrailPoint[][]>([[], []]);
  const dprRef = useRef(1);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useGameLoop((_dtSeconds, nowMs) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = dprRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const points = fingertipsRef.current ?? [];
    const seenHands = new Set<number>();

    for (const point of points) {
      seenHands.add(point.handIndex);
      const trail = trailsByHandRef.current[point.handIndex] ?? (trailsByHandRef.current[point.handIndex] = []);
      trail.push({ x: point.x, y: point.y, t: nowMs });
      while (trail.length && nowMs - trail[0].t > TRAIL_DURATION_MS) trail.shift();

      const color = HAND_COLORS[point.handIndex % HAND_COLORS.length];

      for (const trailPoint of trail) {
        const age = (nowMs - trailPoint.t) / TRAIL_DURATION_MS;
        const alpha = Math.max(0, 1 - age) * 0.35;
        const radius = Math.max(1, 10 * (1 - age * 0.6));
        ctx.beginPath();
        ctx.arc(trailPoint.x, trailPoint.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, alpha);
        ctx.fill();
      }

      ctx.save();

      ctx.beginPath();
      ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.9);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#f7f3ea";
      ctx.fill();

      ctx.restore();
      ctx.beginPath();
      ctx.arc(point.x, point.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.9);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }

    // Let trails for hands that just left the frame fade out naturally.
    trailsByHandRef.current.forEach((trail, handIndex) => {
      if (seenHands.has(handIndex)) return;
      while (trail.length && nowMs - trail[0].t > TRAIL_DURATION_MS) trail.shift();
    });
  }, active);

  return (
    <>
      <canvas ref={canvasRef} className="hand-tracker-canvas" aria-hidden="true" />
      {active && !handsVisible && (
        <div className="hand-hint" role="status">
          Show your hand to the camera ✋
        </div>
      )}
    </>
  );
}
