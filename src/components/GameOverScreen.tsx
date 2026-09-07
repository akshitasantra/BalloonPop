import { useEffect } from "react";

interface GameOverScreenProps {
  score: number;
  highScore: number;
  isNewRecord: boolean;
  onRestart: () => void;
}

export function GameOverScreen({
  score,
  highScore,
  isNewRecord,
  onRestart,
}: GameOverScreenProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key.toLowerCase() === "r") {
        event.preventDefault();
        onRestart();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRestart]);

  return (
    <div className="overlay-screen">
      <div className="overlay-card">
        <p className="overlay-eyebrow">Round complete</p>

        <h1 className="overlay-title">
          {isNewRecord ? "New record" : "Good round"}
        </h1>

        <div className="final-score">{score.toLocaleString()}</div>

        <p className="overlay-instructions">
          Best score: {highScore.toLocaleString()}
        </p>

        <button
          type="button"
          className="primary-button"
          onClick={onRestart}
          autoFocus
        >
          Play Again
        </button>

        <p className="overlay-hint">Press R or Enter to restart</p>
      </div>
    </div>
  );
}