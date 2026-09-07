/**
 * All sound effects are synthesized with the Web Audio API rather than
 * loaded from audio files, so the game has zero binary assets to fetch.
 *
 * Browsers block audio until a user gesture; call `soundManager.unlock()`
 * from a click handler (Start / Restart) before relying on any sound.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private isMuted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioContextCtor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return null;
      this.ctx = new AudioContextCtor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  private noiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const frameCount = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    durationSec: number,
    type: OscillatorType,
    peakGain: number,
    delaySec = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master || this.isMuted) return;
    const startAt = ctx.currentTime + delaySec;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(freqStart, 1), startAt);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), startAt + durationSec);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(startAt);
    osc.stop(startAt + durationSec + 0.02);
  }

  private playNoiseBurst(durationSec: number, peakGain: number, lowpassHz: number, delaySec = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master || this.isMuted) return;
    const startAt = ctx.currentTime + delaySec;

    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer(ctx, durationSec);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpassHz;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peakGain, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(startAt);
    source.stop(startAt + durationSec + 0.02);
  }

  /** Standard balloon pop. `pitch` > 1 raises the tone slightly, used for combo escalation. */
  pop(pitch = 1): void {
    this.playTone(620 * pitch, 160 * pitch, 0.11, "sine", 0.5);
    this.playNoiseBurst(0.04, 0.15, 5000);
  }

  golden(): void {
    this.playTone(880, 1320, 0.09, "triangle", 0.4);
    this.playTone(1320, 1760, 0.12, "triangle", 0.3, 0.06);
  }

  bomb(): void {
    this.playNoiseBurst(0.22, 0.5, 900);
    this.playTone(180, 60, 0.22, "sawtooth", 0.35);
  }

  miss(): void {
    this.playTone(220, 140, 0.14, "sine", 0.18);
  }

  countdownTick(): void {
    this.playTone(440, 440, 0.08, "sine", 0.3);
  }

  go(): void {
    this.playTone(440, 880, 0.18, "sawtooth", 0.35);
  }

  gameOver(): void {
    this.playTone(500, 260, 0.5, "triangle", 0.3);
  }
}

export const soundManager = new SoundManager();
