import { useCallback, useEffect, useRef, useState } from "react";
import { WebcamFeed } from "./components/WebcamFeed";
import { HandTracker } from "./components/HandTracker";
import { GameCanvas } from "./components/GameCanvas";
import { ScoreBoard } from "./components/ScoreBoard";
import { StartScreen } from "./components/StartScreen";
import { GameOverScreen } from "./components/GameOverScreen";
import { useHandTracking } from "./hooks/useHandTracking";
import { soundManager } from "./game/sound";
import { getHighScore, setHighScoreIfBetter } from "./utils/storage";
import { INITIAL_LIVES, ROUND_DURATION_SECONDS } from "./game/constants";
import "./App.css";

type Screen = "start" | "initializing" | "countdown" | "playing" | "gameover";

const COUNTDOWN_STEPS = ["3", "2", "1", "Go!"];
const COUNTDOWN_STEP_MS = 700;

function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdownIndex, setCountdownIndex] = useState(0);
  const [gameId, setGameId] = useState(0);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_DURATION_SECONDS);
  const [combo, setCombo] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [finalScore, setFinalScore] = useState(0);
  const [highScore, setHighScore] = useState(() => getHighScore());
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [muted, setMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { fingertipsRef, handsVisible } = useHandTracking(videoRef, cameraReady);

  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
    setCameraError(null);
  }, []);

  const handleCameraError = useCallback((message: string) => {
    setCameraError(message);
    setScreen("start");
  }, []);

  const beginCamera = useCallback(() => {
    soundManager.unlock();
    setCameraError(null);
    setScreen("initializing");
  }, []);

  // Camera stream is ready -> move on to the pre-round countdown.
  useEffect(() => {
    if (screen === "initializing" && cameraReady) {
      setScreen("countdown");
    }
  }, [screen, cameraReady]);

  // Drives the "3, 2, 1, Go!" overlay and resets round state before play begins.
  useEffect(() => {
    if (screen !== "countdown") return;

    setCountdownIndex(0);
    setScore(0);
    setLives(INITIAL_LIVES);
    setSecondsLeft(ROUND_DURATION_SECONDS);
    setCombo(0);
    setComboMultiplier(1);
    soundManager.countdownTick();

    const intervalId = window.setInterval(() => {
      setCountdownIndex((current) => {
        const next = current + 1;
        if (next >= COUNTDOWN_STEPS.length) {
          window.clearInterval(intervalId);
          soundManager.go();
          setGameId((id) => id + 1);
          setScreen("playing");
          return current;
        }
        soundManager.countdownTick();
        return next;
      });
    }, COUNTDOWN_STEP_MS);

    return () => window.clearInterval(intervalId);
  }, [screen]);

  const handleScoreChange = useCallback((value: number) => setScore(value), []);
  const handleLivesChange = useCallback((value: number) => setLives(value), []);
  const handleComboChange = useCallback((comboValue: number, multiplier: number) => {
    setCombo(comboValue);
    setComboMultiplier(multiplier);
  }, []);
  const handleTimeChange = useCallback((value: number) => setSecondsLeft(value), []);

  const handleGameOver = useCallback((finalScoreValue: number) => {
    setFinalScore(finalScoreValue);
    const result = setHighScoreIfBetter(finalScoreValue);
    setHighScore(result.highScore);
    setIsNewRecord(result.isNewRecord);
    setScreen("gameover");
  }, []);

  const handleRestart = useCallback(() => {
    soundManager.unlock();
    setScreen("countdown");
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((current) => {
      soundManager.setMuted(!current);
      return !current;
    });
  }, []);

  // The camera + hand tracking stay mounted from "initializing" all the way
  // through "gameover" so restarting doesn't re-prompt for permission.
  const isCameraStageVisible = screen !== "start";

  return (
    <div className="game-stage">
      {isCameraStageVisible && (
        <WebcamFeed ref={videoRef} enabled onReady={handleCameraReady} onError={handleCameraError} />
      )}

      {cameraReady && <HandTracker fingertipsRef={fingertipsRef} active handsVisible={handsVisible} />}

      {screen === "playing" && (
        <GameCanvas
          key={gameId}
          fingertipsRef={fingertipsRef}
          onScoreChange={handleScoreChange}
          onLivesChange={handleLivesChange}
          onComboChange={handleComboChange}
          onTimeChange={handleTimeChange}
          onGameOver={handleGameOver}
        />
      )}

      {(screen === "playing" || screen === "countdown") && (
        <ScoreBoard
          score={score}
          lives={lives}
          maxLives={INITIAL_LIVES}
          secondsLeft={secondsLeft}
          combo={combo}
          comboMultiplier={comboMultiplier}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
      )}

      {screen === "start" && <StartScreen onStart={beginCamera} errorMessage={cameraError} />}

      {screen === "initializing" && (
        <div className="overlay-screen">
          <div className="overlay-card overlay-card--loading">
            <p className="overlay-eyebrow">Getting ready</p>
            <h1 className="overlay-title">Warming up the camera&hellip;</h1>
            <div className="spinner" aria-hidden="true" />
            {cameraError && (
              <p className="overlay-error" role="alert">
                {cameraError}
              </p>
            )}
          </div>
        </div>
      )}

      {screen === "countdown" && (
        <div className="overlay-screen overlay-screen--transparent" aria-live="polite">
          <div className="countdown-number" key={countdownIndex}>
            {COUNTDOWN_STEPS[countdownIndex]}
          </div>
        </div>
      )}

      {screen === "gameover" && (
        <GameOverScreen score={finalScore} highScore={highScore} isNewRecord={isNewRecord} onRestart={handleRestart} />
      )}
    </div>
  );
}

export default App;
