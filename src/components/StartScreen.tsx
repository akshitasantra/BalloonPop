import { useEffect } from "react";

interface StartScreenProps {
  onStart: () => void;
  errorMessage: string | null;
}

export function StartScreen({ onStart, errorMessage }: StartScreenProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onStart();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onStart]);

  return (
    <div className="overlay-screen">
      <div className="overlay-card">
        <p className="overlay-eyebrow">Camera game</p>

        <h1 className="overlay-title">Balloon Pop</h1>

        <p className="overlay-instructions">
          Allow camera access, then move your hand through the balloons to pop
          them.
        </p>

        <ul className="overlay-rules">
          <li>
            <span
              className="rule-swatch rule-swatch--normal"
              aria-hidden="true"
            />
            Pop balloons to score points
          </li>

          <li>
            <span
              className="rule-swatch rule-swatch--golden"
              aria-hidden="true"
            />
            Gold balloons give you a bonus
          </li>

          <li>
            <span
              className="rule-swatch rule-swatch--bomb"
              aria-hidden="true"
            />
            Avoid bombs. They cost a point and a life
          </li>

          <li>
            <span
              className="rule-swatch rule-swatch--miss"
              aria-hidden="true"
            />
            Missed balloons cost a life
          </li>
        </ul>

        {errorMessage && (
          <p className="overlay-error" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          className="primary-button"
          onClick={onStart}
          autoFocus
        >
          Start Game
        </button>

        <p className="overlay-hint">Press Enter or Space to start</p>
      </div>
    </div>
  );
}