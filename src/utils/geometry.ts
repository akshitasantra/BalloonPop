export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomFrom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Does the segment p1->p2 pass within `radius` of `center`?
 *
 * Used for balloon-pop hit testing: rather than only checking the
 * fingertip's current point (which misses fast swipes between frames), we
 * check the whole segment travelled since the previous frame. A degenerate
 * segment (p1 === p2) correctly falls back to a plain point-in-circle test.
 */
export function segmentIntersectsCircle(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  cx: number,
  cy: number,
  radius: number,
): boolean {
  const dx = p2x - p1x;
  const dy = p2y - p1y;
  const fx = p1x - cx;
  const fy = p1y - cy;

  const a = dx * dx + dy * dy;
  if (a === 0) {
    return fx * fx + fy * fy <= radius * radius;
  }

  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) return true;
  // Whole segment starts and ends inside the circle.
  if (t1 < 0 && t2 > 1) return true;
  return false;
}
