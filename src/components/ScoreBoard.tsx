import { memo } from "react";

interface ScoreBoardProps {
  score: number;
  lives: number;
  maxLives: number;
  secondsLeft: number;
  combo: number;
  comboMultiplier: number;
  muted: boolean;
  onToggleMute: () => void;
}

const COMBO_LIGHT_COUNT = 8;

function ScoreBoardComponent({
  score,
  lives,
  maxLives,
  secondsLeft,
  combo,
  comboMultiplier,
  muted,
  onToggleMute,
}: ScoreBoardProps) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const litLights = Math.min(combo, COMBO_LIGHT_COUNT);

  return (
    <div className="scoreboard">
      <div className="scoreboard__row scoreboard__row--top">
        <div className="hud-panel hud-panel--score">
          <span className="hud-panel__label">Score</span>
          <span className="hud-panel__value">{score.toLocaleString()}</span>
        </div>

        <div
          className="hud-panel hud-panel--timer"
          data-urgent={secondsLeft <= 10}
        >
          <span className="hud-panel__label">Time</span>
          <span className="hud-panel__value">{timeLabel}</span>
        </div>

        <button
          type="button"
          className="mute-button"
          onClick={onToggleMute}
          aria-pressed={muted}
          aria-label={
            muted ? "Unmute sound effects" : "Mute sound effects"
          }
        >
          {muted ? "Sound off" : "Sound on"}
        </button>
      </div>

      <div className="scoreboard__row scoreboard__row--bottom">
        <div
          className="lives"
          aria-label={`${lives} of ${maxLives} lives remaining`}
        >
          {Array.from({ length: maxLives }, (_, i) => (
            <span
              key={i}
              className={`life-balloon ${
                i < lives ? "is-alive" : "is-lost"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        <div
          className="combo-meter"
          aria-label={`Combo multiplier ${comboMultiplier}x`}
        >
          <div className="combo-meter__bulbs">
            {Array.from({ length: COMBO_LIGHT_COUNT }, (_, i) => (
              <span
                key={i}
                className={`combo-bulb ${i < litLights ? "is-lit" : ""}`}
              />
            ))}
          </div>

          {comboMultiplier > 1 && (
            <span className="combo-meter__multiplier">
              x{comboMultiplier}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const ScoreBoard = memo(ScoreBoardComponent);