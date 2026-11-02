/**
 * Audio — Web Audio API sound engine.
 *
 * All sounds are synthesised programmatically — no external audio files.
 * AudioContext is created lazily on first user interaction to comply with
 * browser autoplay policies.
 */

export class AudioEngine {
  private _ctx: AudioContext | null = null;
  private _enabled: boolean = false;

  // Lazily initialise AudioContext after first user gesture
  private _getContext(): AudioContext | null {
    if (!this._enabled) return null;
    if (!this._ctx) {
      try {
        this._ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    // Resume if suspended (can happen after inactivity)
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {/* silent */});
    }
    return this._ctx;
  }

  get isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(on: boolean): void {
    this._enabled = on;
  }

  private _beep(
    frequency: number,
    duration: number,
    gain = 0.15,
    type: OscillatorType = 'sine',
    startDelay = 0,
  ): void {
    const ctx = this._getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay);
    gainNode.gain.setValueAtTime(0, ctx.currentTime + startDelay);
    gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + startDelay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(ctx.currentTime + startDelay);
    osc.stop(ctx.currentTime + startDelay + duration + 0.01);
  }

  playCountdownTick(): void {
    this._beep(880, 0.08, 0.1, 'square');
  }

  playGo(): void {
    // Short punchy chord
    this._beep(523.25, 0.15, 0.18, 'sine', 0);       // C5
    this._beep(659.25, 0.15, 0.14, 'sine', 0.02);    // E5
    this._beep(783.99, 0.2, 0.12, 'sine', 0.04);     // G5
  }

  playResult(time: number): void {
    // Higher = faster = more cheerful
    const freq = time < 200 ? 880 : time < 300 ? 659 : 523;
    this._beep(freq, 0.12, 0.12, 'sine');
  }

  playFalseStart(): void {
    this._beep(220, 0.2, 0.15, 'sawtooth', 0);
    this._beep(180, 0.3, 0.1, 'sawtooth', 0.15);
  }

  playNewPersonalBest(): void {
    // Ascending arpeggio
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this._beep(freq, 0.15, 0.13, 'sine', i * 0.1);
    });
  }
}
