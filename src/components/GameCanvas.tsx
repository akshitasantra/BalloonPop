import { memo, useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { TrackedPoint } from "../game/types";
import { createInitialState, stepGame } from "../game/engine";
import { drawScene } from "../game/renderer";
import { useGameLoop } from "../hooks/useGameLoop";
import { soundManager } from "../game/sound";

interface GameCanvasProps {
  fingertipsRef: RefObject<TrackedPoint[]>;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onComboChange: (combo: number, multiplier: number) => void;
  onTimeChange: (secondsLeft: number) => void;
  onGameOver: (finalScore: number) => void;
}

interface ReportedValues {
  score: number;
  lives: number;
  combo: number;
  seconds: number;
}

function GameCanvasComponent({
  fingertipsRef,
  onScoreChange,
  onLivesChange,
  onComboChange,
  onTimeChange,
  onGameOver,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dprRef = useRef(1);
  // Lazily created once per mount. App.tsx forces a remount on restart via a `key` prop,
  // which is what actually resets a round — no imperative "reset" method needed.
  const stateRef = useRef(createInitialState());
  const lastReportedRef = useRef<ReportedValues>({ score: -1, lives: -1, combo: -1, seconds: -1 });
  const gameOverFiredRef = useRef(false);

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

  useGameLoop((dtSeconds, nowMs) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const state = stateRef.current;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const fingertips = fingertipsRef.current ?? [];

    const events = stepGame(state, dtSeconds, nowMs, viewport, fingertips);

    for (const popEvent of events.popped) {
      if (popEvent.balloon.kind === "golden") {
        soundManager.golden();
      } else {
        soundManager.pop(1 + Math.min(popEvent.comboAtPop, 6) * 0.05);
      }
    }
    if (events.bombHit) soundManager.bomb();
    if (events.missedCount > 0) soundManager.miss();

    const dpr = dprRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene(ctx, viewport.width, viewport.height, state.balloons, state.particles, nowMs);

    const last = lastReportedRef.current;
    if (state.score !== last.score) {
      last.score = state.score;
      onScoreChange(state.score);
    }
    if (state.lives !== last.lives) {
      last.lives = state.lives;
      onLivesChange(state.lives);
    }
    if (state.combo !== last.combo) {
      last.combo = state.combo;
      onComboChange(state.combo, state.comboMultiplier);
    }
    const secondsLeft = Math.ceil(state.timeRemainingMs / 1000);
    if (secondsLeft !== last.seconds) {
      last.seconds = secondsLeft;
      onTimeChange(secondsLeft);
    }

    if (state.status === "over" && !gameOverFiredRef.current) {
      gameOverFiredRef.current = true;
      soundManager.gameOver();
      onGameOver(state.score);
    }
  }, true);

  return <canvas ref={canvasRef} className="game-canvas" aria-hidden="true" />;
}

// Props are all stable (refs + useCallback-wrapped functions from App), so this
// never needs to re-render when unrelated HUD state (e.g. a sibling's score
// display) changes — the whole simulation lives in the imperative loop above.
export const GameCanvas = memo(GameCanvasComponent);
