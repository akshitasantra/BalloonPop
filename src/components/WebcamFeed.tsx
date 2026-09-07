import { forwardRef, useEffect, useRef } from "react";
import type { Ref } from "react";

interface WebcamFeedProps {
  /** Camera permission is only requested once this becomes true (a user gesture must precede it). */
  enabled: boolean;
  onReady: () => void;
  onError: (message: string) => void;
}

function WebcamFeedInner({ enabled, onReady, onError }: WebcamFeedProps, forwardedRef: Ref<HTMLVideoElement>) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = localVideoRef.current;
        if (!video) return;

        video.srcObject = stream;
        video.addEventListener("loadeddata", () => onReady(), { once: true });
        await video.play();
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera access was denied. Allow camera access in your browser's site settings and try again."
            : "Couldn't access your camera. Make sure it's connected and not in use by another app.";
        onError(message);
      }
    }

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [enabled, onReady, onError]);

  return (
    <video
      ref={(node) => {
        localVideoRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) (forwardedRef as { current: HTMLVideoElement | null }).current = node;
      }}
      className="webcam-feed"
      autoPlay
      muted
      playsInline
    />
  );
}

/** Renders the user's live camera feed, mirrored like a selfie camera, filling the viewport. */
export const WebcamFeed = forwardRef(WebcamFeedInner);
