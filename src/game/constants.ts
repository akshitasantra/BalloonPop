/**
 * All the "game design" knobs live here so balance can be tuned without
 * hunting through engine/render code.
 */

export const ROUND_DURATION_MS = 60_000;
export const ROUND_DURATION_SECONDS = ROUND_DURATION_MS / 1000;
export const INITIAL_LIVES = 3;

// Balloons spawn faster as the round goes on.
export const SPAWN_INTERVAL_START_MS = 1100;
export const SPAWN_INTERVAL_MIN_MS = 420;

export const BALLOON_MIN_RADIUS = 32;
export const BALLOON_MAX_RADIUS = 58;

export const BALLOON_MIN_SPEED = 70; // px / second, upward
export const BALLOON_MAX_SPEED = 150;
/** Balloons move a little faster still by the end of the round. */
export const BALLOON_SPEED_RAMP = 1.4;

// Special balloon odds ramp up with difficulty too.
export const GOLDEN_CHANCE_START = 0.06;
export const GOLDEN_CHANCE_END = 0.11;
export const BOMB_CHANCE_START = 0.04;
export const BOMB_CHANCE_END = 0.1;

export const COMBO_WINDOW_MS = 1200;
export const COMBO_MAX_MULTIPLIER = 5;

export const SCORE_NORMAL = 10;
export const SCORE_GOLDEN = 50;
export const BOMB_SCORE_PENALTY = 20;

export const BALLOON_COLORS = [
  "#FF5D8F", // coral pink
  "#2EC4B6", // teal
  "#6C5CE7", // violet
  "#FF9F1C", // tangerine
  "#4CC9F0", // sky blue
  "#F25C9C", // watermelon
];

export const GOLDEN_COLOR = "#FFD23F";
export const BOMB_COLOR = "#332745";

/** How many hands MediaPipe should track at once (1 or 2). */
export const MAX_HANDS = 2;

// One-Euro filter tuning for fingertip smoothing. Lower minCutoff = smoother
// but laggier when still; higher beta = snappier response to fast motion.
export const SMOOTHING_MIN_CUTOFF = 1.0;
export const SMOOTHING_BETA = 0.45;
export const SMOOTHING_D_CUTOFF = 1.0;

export const PARTICLES_PER_POP = 14;
export const PARTICLE_GRAVITY = 420; // px / second^2

export const HIGH_SCORE_STORAGE_KEY = "balloonPop.highScore";
