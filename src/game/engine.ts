import type { Balloon, BalloonKind, FrameEvents, GameState, PopEvent, TrackedPoint } from "./types";
import {
  BALLOON_COLORS,
  BALLOON_MAX_RADIUS,
  BALLOON_MAX_SPEED,
  BALLOON_MIN_RADIUS,
  BALLOON_MIN_SPEED,
  BALLOON_SPEED_RAMP,
  BOMB_CHANCE_END,
  BOMB_CHANCE_START,
  BOMB_COLOR,
  BOMB_SCORE_PENALTY,
  COMBO_MAX_MULTIPLIER,
  COMBO_WINDOW_MS,
  GOLDEN_CHANCE_END,
  GOLDEN_CHANCE_START,
  GOLDEN_COLOR,
  INITIAL_LIVES,
  ROUND_DURATION_MS,
  SCORE_GOLDEN,
  SCORE_NORMAL,
  SPAWN_INTERVAL_MIN_MS,
  SPAWN_INTERVAL_START_MS,
} from "./constants";
import { clamp, lerp, randRange, randomFrom, segmentIntersectsCircle } from "../utils/geometry";
import { spawnPopParticles, updateParticles } from "./particles";

export interface Viewport {
  width: number;
  height: number;
}

export function createInitialState(): GameState {
  return {
    status: "playing",
    score: 0,
    lives: INITIAL_LIVES,
    combo: 0,
    comboMultiplier: 1,
    comboExpiresAt: 0,
    elapsedMs: 0,
    timeRemainingMs: ROUND_DURATION_MS,
    nextSpawnAt: 0,
    spawnIntervalMs: SPAWN_INTERVAL_START_MS,
    balloons: [],
    particles: [],
    nextId: 1,
  };
}

/** 0 at round start, 1 at round end — drives every difficulty curve. */
function difficultyProgress(state: GameState): number {
  return clamp(state.elapsedMs / ROUND_DURATION_MS, 0, 1);
}

function pickBalloonKind(t: number): BalloonKind {
  const bombChance = lerp(BOMB_CHANCE_START, BOMB_CHANCE_END, t);
  const goldenChance = lerp(GOLDEN_CHANCE_START, GOLDEN_CHANCE_END, t);
  const roll = Math.random();
  if (roll < bombChance) return "bomb";
  if (roll < bombChance + goldenChance) return "golden";
  return "normal";
}

function spawnBalloon(state: GameState, viewport: Viewport): void {
  const t = difficultyProgress(state);
  const kind = pickBalloonKind(t);
  const radius = randRange(BALLOON_MIN_RADIUS, BALLOON_MAX_RADIUS) * (kind === "bomb" ? 0.9 : 1);
  const minX = radius + 8;
  const maxX = Math.max(minX, viewport.width - radius - 8);

  const balloon: Balloon = {
    id: state.nextId++,
    x: randRange(minX, maxX),
    y: viewport.height + radius + randRange(0, 80),
    radius,
    kind,
    color: kind === "golden" ? GOLDEN_COLOR : kind === "bomb" ? BOMB_COLOR : randomFrom(BALLOON_COLORS),
    speed: randRange(BALLOON_MIN_SPEED, BALLOON_MAX_SPEED) * lerp(1, BALLOON_SPEED_RAMP, t),
    wobbleAmplitude: randRange(10, 30),
    wobbleFrequency: randRange(0.6, 1.6),
    wobblePhase: randRange(0, Math.PI * 2),
    spawnTime: state.elapsedMs,
    popped: false,
  };
  state.balloons.push(balloon);
}

function updateSpawning(state: GameState, viewport: Viewport): void {
  const t = difficultyProgress(state);
  state.spawnIntervalMs = lerp(SPAWN_INTERVAL_START_MS, SPAWN_INTERVAL_MIN_MS, t);
  if (state.elapsedMs >= state.nextSpawnAt) {
    spawnBalloon(state, viewport);
    state.nextSpawnAt = state.elapsedMs + state.spawnIntervalMs * randRange(0.7, 1.3);
  }
}

/** Moves balloons upward, applies a gentle sideways sway, and removes any that drifted off-screen. */
function updateBalloonPositions(state: GameState, dtSeconds: number): number {
  let missed = 0;
  const remaining: Balloon[] = [];
  for (const balloon of state.balloons) {
    if (balloon.popped) continue;
    balloon.y -= balloon.speed * dtSeconds;
    const age = (state.elapsedMs - balloon.spawnTime) / 1000;
    balloon.x += Math.sin(age * balloon.wobbleFrequency + balloon.wobblePhase) * balloon.wobbleAmplitude * dtSeconds;

    if (balloon.y + balloon.radius < -20) {
      // Floated off the top of the screen. Letting a bomb escape is free;
      // letting a normal/golden balloon escape costs a life.
      if (balloon.kind !== "bomb") missed++;
      continue;
    }
    remaining.push(balloon);
  }
  state.balloons = remaining;
  return missed;
}

function registerComboHit(state: GameState, nowMs: number): void {
  state.combo = nowMs <= state.comboExpiresAt ? state.combo + 1 : 1;
  state.comboExpiresAt = nowMs + COMBO_WINDOW_MS;
  state.comboMultiplier = Math.min(COMBO_MAX_MULTIPLIER, 1 + Math.floor(state.combo / 2));
}

function resetCombo(state: GameState): void {
  state.combo = 0;
  state.comboMultiplier = 1;
  state.comboExpiresAt = 0;
}

function handleCollisions(
  state: GameState,
  fingertips: TrackedPoint[],
  nowMs: number,
): { popped: PopEvent[]; bombHit: boolean } {
  const popped: PopEvent[] = [];
  let bombHit = false;
  if (fingertips.length === 0) return { popped, bombHit };

  for (const balloon of state.balloons) {
    if (balloon.popped) continue;

    for (const fingertip of fingertips) {
      if (!fingertip.visible) continue;
      const hit = segmentIntersectsCircle(
        fingertip.prevX,
        fingertip.prevY,
        fingertip.x,
        fingertip.y,
        balloon.x,
        balloon.y,
        balloon.radius,
      );
      if (!hit) continue;

      balloon.popped = true;

      if (balloon.kind === "bomb") {
        bombHit = true;
        resetCombo(state);
        state.score = Math.max(0, state.score - BOMB_SCORE_PENALTY);
        state.lives -= 1;
        state.particles.push(...spawnPopParticles(balloon.x, balloon.y, "#FF6B6B", 20));
      } else {
        registerComboHit(state, nowMs);
        const base = balloon.kind === "golden" ? SCORE_GOLDEN : SCORE_NORMAL;
        const scoreDelta = base * state.comboMultiplier;
        state.score += scoreDelta;
        popped.push({ balloon, scoreDelta, comboAtPop: state.combo });
        state.particles.push(...spawnPopParticles(balloon.x, balloon.y, balloon.color, balloon.kind === "golden" ? 22 : 14));
      }
      break;
    }
  }

  if (popped.length > 0 || bombHit) {
    state.balloons = state.balloons.filter((b) => !b.popped);
  }
  return { popped, bombHit };
}

/**
 * Advances the simulation by one frame. Mutates `state` in place (avoiding
 * per-frame allocation of a whole new state tree) and returns the events
 * that happened this frame so the caller can trigger sound/haptics.
 */
export function stepGame(
  state: GameState,
  dtSeconds: number,
  nowMs: number,
  viewport: Viewport,
  fingertips: TrackedPoint[],
): FrameEvents {
  const events: FrameEvents = { popped: [], missedCount: 0, bombHit: false };
  if (state.status !== "playing") return events;

  state.elapsedMs += dtSeconds * 1000;
  state.timeRemainingMs = Math.max(0, ROUND_DURATION_MS - state.elapsedMs);

  // Let the combo visibly lapse even if the player doesn't pop anything else.
  if (state.combo > 0 && nowMs > state.comboExpiresAt) {
    resetCombo(state);
  }

  updateSpawning(state, viewport);
  const missed = updateBalloonPositions(state, dtSeconds);
  if (missed > 0) state.lives -= missed;

  const { popped, bombHit } = handleCollisions(state, fingertips, nowMs);
  state.particles = updateParticles(state.particles, dtSeconds);

  events.popped = popped;
  events.missedCount = missed;
  events.bombHit = bombHit;

  if (state.lives <= 0 || state.timeRemainingMs <= 0) {
    state.status = "over";
    state.lives = Math.max(0, state.lives);
  }

  return events;
}
