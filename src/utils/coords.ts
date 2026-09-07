/**
 * Maps a normalized MediaPipe landmark (0..1, relative to the raw,
 * un-mirrored camera frame) to CSS pixel coordinates that line up with the
 * on-screen video, which is displayed mirrored and cropped via
 * `object-fit: cover`.
 *
 * We deliberately never flip the actual video pixels we feed to the model —
 * only the CSS display is mirrored — so this function does the mirroring
 * math instead. That keeps the hot detection path a single
 * `detectForVideo(videoElement, timestamp)` call with no extra canvas copy.
 */
export function mapNormalizedToMirroredScreen(
  normalizedX: number,
  normalizedY: number,
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
): { x: number; y: number } {
  // `object-fit: cover` scales the video uniformly until it fills the
  // container, cropping whichever axis overflows.
  const scale = Math.max(containerWidth / videoWidth, containerHeight / videoHeight);
  const scaledWidth = videoWidth * scale;
  const scaledHeight = videoHeight * scale;
  const cropX = (scaledWidth - containerWidth) / 2;
  const cropY = (scaledHeight - containerHeight) / 2;

  const videoPixelX = normalizedX * scaledWidth - cropX;
  const videoPixelY = normalizedY * scaledHeight - cropY;

  // Mirror horizontally (scaleX(-1) flips the video element about its own
  // center, which — since the video box equals the container box — is
  // equivalent to reflecting across the container's horizontal midline).
  return {
    x: containerWidth - videoPixelX,
    y: videoPixelY,
  };
}
