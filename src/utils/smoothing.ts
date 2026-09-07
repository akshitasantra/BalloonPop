/**
 * One-Euro Filter (Casiez, Roussel, Vogel 2012).
 *
 * Raw MediaPipe landmark coordinates are jittery frame-to-frame. A plain
 * low-pass filter smooths that out but adds noticeable lag when the hand
 * moves quickly. The One-Euro filter adapts its cutoff frequency based on
 * the signal's speed: heavy smoothing when the fingertip is nearly still,
 * and a snappier response during fast swipes.
 */

class LowPassFilter {
  private lastOutput: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.lastOutput === null) {
      this.lastOutput = value;
      return value;
    }
    const result = alpha * value + (1 - alpha) * this.lastOutput;
    this.lastOutput = result;
    return result;
  }

  reset(): void {
    this.lastOutput = null;
  }
}

function computeAlpha(cutoffHz: number, dtSeconds: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dtSeconds);
}

export class OneEuroFilter {
  private readonly valueFilter = new LowPassFilter();
  private readonly derivativeFilter = new LowPassFilter();
  private lastValue: number | null = null;
  private lastTimestampMs: number | null = null;
  private minCutoff: number;
  private beta: number;
  private derivativeCutoff: number;

  constructor(minCutoff = 1.0, beta = 0.0, derivativeCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.derivativeCutoff = derivativeCutoff;
  }

  filter(value: number, timestampMs: number): number {
    if (this.lastTimestampMs === null) {
      this.lastTimestampMs = timestampMs;
      this.lastValue = value;
      this.valueFilter.filter(value, 1);
      return value;
    }

    const dt = Math.max((timestampMs - this.lastTimestampMs) / 1000, 1 / 120);
    this.lastTimestampMs = timestampMs;

    const derivative = (value - (this.lastValue ?? value)) / dt;
    this.lastValue = value;

    const smoothedDerivative = this.derivativeFilter.filter(
      derivative,
      computeAlpha(this.derivativeCutoff, dt),
    );

    const adaptiveCutoff = this.minCutoff + this.beta * Math.abs(smoothedDerivative);
    return this.valueFilter.filter(value, computeAlpha(adaptiveCutoff, dt));
  }

  reset(): void {
    this.valueFilter.reset();
    this.derivativeFilter.reset();
    this.lastValue = null;
    this.lastTimestampMs = null;
  }
}

/** Convenience wrapper applying an independent One-Euro filter to x and y. */
export class Point2DFilter {
  private readonly filterX: OneEuroFilter;
  private readonly filterY: OneEuroFilter;

  constructor(minCutoff = 1.0, beta = 0.0, derivativeCutoff = 1.0) {
    this.filterX = new OneEuroFilter(minCutoff, beta, derivativeCutoff);
    this.filterY = new OneEuroFilter(minCutoff, beta, derivativeCutoff);
  }

  filter(x: number, y: number, timestampMs: number): [number, number] {
    return [this.filterX.filter(x, timestampMs), this.filterY.filter(y, timestampMs)];
  }

  reset(): void {
    this.filterX.reset();
    this.filterY.reset();
  }
}
