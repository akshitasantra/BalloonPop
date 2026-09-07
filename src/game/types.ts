/**
 * Core data types shared between the game engine (logic) and the renderer
 * (drawing). Keeping these in one place is what lets engine.ts stay
 * completely ignorant of <canvas> / CanvasRenderingContext2D.
 */

export type BalloonKind = "normal" | "golden" | "bomb";

export interface Balloon {
  id: number;
  /** Center position, in CSS pixels of the game viewport. */
  x: number;
  y: number;
  radius: number;
  kind: BalloonKind;
  color: string;
  /** Upward speed in px/second. */
  speed: number;
  wobbleAmplitude: number;
  wobbleFrequency: number;
  wobblePhase: number;
  /** state.elapsedMs at the moment this balloon spawned. */
  spawnTime: number;
  popped: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  /** Seconds remaining before this particle disappears. */
  life: number;
  maxLife: number;
  gravity: number;
}

/**
 * A single tracked fingertip, in mirrored screen-space CSS pixels.
 * `prevX/prevY` is last frame's position, which lets us treat fast swipes
 * as a line segment for collision testing instead of a single point.
 */
export interface TrackedPoint {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  visible: boolean;
  handIndex: number;
}

export type GameStatus = "playing" | "over";

export interface PopEvent {
  balloon: Balloon;
  scoreDelta: number;
  comboAtPop: number;
}

export interface FrameEvents {
  popped: PopEvent[];
  missedCount: number;
  bombHit: boolean;
}

export interface GameState {
  status: GameStatus;
  score: number;
  lives: number;
  combo: number;
  comboMultiplier: number;
  /** Timestamp (performance.now()) after which the combo streak lapses. */
  comboExpiresAt: number;
  elapsedMs: number;
  timeRemainingMs: number;
  /** state.elapsedMs value at which the next balloon should spawn. */
  nextSpawnAt: number;
  spawnIntervalMs: number;
  balloons: Balloon[];
  particles: Particle[];
  nextId: number;
}
