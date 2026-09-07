import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type { TrackedPoint } from "../game/types";
import { MAX_HANDS, SMOOTHING_BETA, SMOOTHING_D_CUTOFF, SMOOTHING_MIN_CUTOFF } from "../game/constants";
import { Point2DFilter } from "../utils/smoothing";
import { mapNormalizedToMirroredScreen } from "../utils/coords";

// Pinned to match the installed @mediapipe/tasks-vision version so the WASM
// build fetched from the CDN always matches the JS API we compiled against.
const TASKS_VISION_VERSION = "0.10.35";
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const INDEX_FINGERTIP_LANDMARK = 8;

interface UseHandTrackingResult {
  /** Mutable ref, updated every detection frame. Read this in render loops — don't watch it via state. */
  fingertipsRef: RefObject<TrackedPoint[]>;
  /** Low-frequency state (only flips when a hand appears/disappears) — safe to use in JSX. */
  handsVisible: boolean;
  isModelLoading: boolean;
  modelError: string | null;
}

async function createHandLandmarker(): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
  const baseConfig = {
    runningMode: "VIDEO" as const,
    numHands: MAX_HANDS,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  };
  try {
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_ASSET_URL, delegate: "GPU" },
      ...baseConfig,
    });
  } catch {
    // Some devices/browsers don't support the GPU delegate — fall back to CPU.
    return HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_ASSET_URL, delegate: "CPU" },
      ...baseConfig,
    });
  }
}

/**
 * Loads MediaPipe's HandLandmarker and continuously tracks the index
 * fingertip of up to `MAX_HANDS` hands from a live <video> element.
 *
 * The model itself starts loading as soon as this hook mounts (it only
 * needs a network connection, not camera permission), so by the time the
 * player grants camera access it's usually already warm.
 */
export function useHandTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  isActive: boolean,
): UseHandTrackingResult {
  const fingertipsRef = useRef<TrackedPoint[]>([]);
  const [handsVisible, setHandsVisible] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);

  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const filtersRef = useRef<Point2DFilter[]>([]);
  const lastVideoTimeRef = useRef<number>(-1);

  // Load the model once. Independent of camera permission / `isActive`.
  useEffect(() => {
    let cancelled = false;
    setIsModelLoading(true);
    setModelError(null);

    createHandLandmarker()
      .then((landmarker) => {
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setIsModelLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("Failed to load hand tracking model", err);
        setModelError("Couldn't load the hand-tracking model. Check your connection and reload the page.");
        setIsModelLoading(false);
      });

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  // Detection loop: re-runs when the model finishes loading or `isActive` flips.
  useEffect(() => {
    if (!isActive || isModelLoading) return;
    const landmarker = landmarkerRef.current;
    const video = videoRef.current;
    if (!landmarker || !video) return;

    let wasVisible = false;
    let rafId = 0;

    const detect = () => {
      rafId = requestAnimationFrame(detect);

      const currentLandmarker = landmarkerRef.current;
      if (!currentLandmarker || video.readyState < 2 || video.videoWidth === 0) return;
      if (video.currentTime === lastVideoTimeRef.current) return; // no new frame yet
      lastVideoTimeRef.current = video.currentTime;

      const nowMs = performance.now();
      let result: HandLandmarkerResult;
      try {
        result = currentLandmarker.detectForVideo(video, nowMs);
      } catch (err) {
        console.error("Hand detection frame failed", err);
        return;
      }

      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const previousPoints = fingertipsRef.current;

      const nextPoints: TrackedPoint[] = [];
      for (let handIndex = 0; handIndex < result.landmarks.length && handIndex < MAX_HANDS; handIndex++) {
        const landmark = result.landmarks[handIndex][INDEX_FINGERTIP_LANDMARK];
        if (!landmark) continue;

        const raw = mapNormalizedToMirroredScreen(
          landmark.x,
          landmark.y,
          videoWidth,
          videoHeight,
          containerWidth,
          containerHeight,
        );

        if (!filtersRef.current[handIndex]) {
          filtersRef.current[handIndex] = new Point2DFilter(SMOOTHING_MIN_CUTOFF, SMOOTHING_BETA, SMOOTHING_D_CUTOFF);
        }
        const [smoothX, smoothY] = filtersRef.current[handIndex].filter(raw.x, raw.y, nowMs);

        const previous = previousPoints.find((p) => p.handIndex === handIndex);
        nextPoints.push({
          x: smoothX,
          y: smoothY,
          prevX: previous?.visible ? previous.x : smoothX,
          prevY: previous?.visible ? previous.y : smoothY,
          visible: true,
          handIndex,
        });
      }

      fingertipsRef.current = nextPoints;

      const isVisible = nextPoints.length > 0;
      if (isVisible !== wasVisible) {
        wasVisible = isVisible;
        setHandsVisible(isVisible);
      }
    };

    rafId = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(rafId);
  }, [isActive, isModelLoading, videoRef]);

  return { fingertipsRef, handsVisible, isModelLoading, modelError };
}
