import { HIGH_SCORE_STORAGE_KEY } from "../game/constants";

export function getHighScore(): number {
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    // Storage can throw in private-browsing modes or sandboxed iframes.
    return 0;
  }
}

export function setHighScoreIfBetter(score: number): { highScore: number; isNewRecord: boolean } {
  const current = getHighScore();
  if (score > current) {
    try {
      window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(score));
    } catch {
      // Ignore write failures; the session's score is still shown either way.
    }
    return { highScore: score, isNewRecord: true };
  }
  return { highScore: current, isNewRecord: false };
}
