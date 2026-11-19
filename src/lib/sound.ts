/**
 * Sound effects for the Nối Từ game.
 *
 * Uses the Web Audio API to generate simple tones/beeps.
 * No external MP3 files needed — all sounds are synthesized.
 *
 * Sounds:
 * - correct:  cheerful ascending chime (C5 → E5 → G5)
 * - wrong:    low descending buzz (A3 → F3)
 * - turn:     gentle notification ping (G5)
 * - win:      celebratory fanfare (C5 → E5 → G5 → C6)
 * - tick:     subtle clock tick for timer warnings
 */

type SoundName = 'correct' | 'wrong' | 'turn' | 'win' | 'tick';

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  /** Lazily create AudioContext (must be after user interaction). */
  private getContext(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    // Resume if suspended (browsers block autoplay before interaction)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /** Enable or disable all sounds. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Whether sounds are currently enabled. */
  getEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play a simple tone.
   *
   * @param frequency  Frequency in Hz.
   * @param duration   Duration in seconds.
   * @param startTime  When to start (relative to ctx.currentTime).
   * @param type       Oscillator type.
   * @param volume     Gain (0–1).
   */
  private playTone(
    frequency: number,
    duration: number,
    startTime: number = 0,
    type: OscillatorType = 'sine',
    volume: number = 0.3,
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(volume, ctx.currentTime + startTime);
    // Fade out to avoid clicks
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + startTime + duration,
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  }

  /** Play a named sound effect. */
  play(name: SoundName): void {
    if (!this.enabled) return;

    switch (name) {
      case 'correct':
        // Cheerful ascending chime: C5 → E5 → G5
        this.playTone(523.25, 0.15, 0, 'sine', 0.25);     // C5
        this.playTone(659.25, 0.15, 0.1, 'sine', 0.25);   // E5
        this.playTone(783.99, 0.25, 0.2, 'sine', 0.3);    // G5
        break;

      case 'wrong':
        // Low descending buzz: A3 → F3
        this.playTone(220, 0.2, 0, 'sawtooth', 0.15);     // A3
        this.playTone(174.61, 0.3, 0.15, 'sawtooth', 0.12); // F3
        break;

      case 'turn':
        // Gentle notification ping
        this.playTone(783.99, 0.15, 0, 'sine', 0.2);      // G5
        this.playTone(1046.5, 0.2, 0.1, 'sine', 0.15);    // C6
        break;

      case 'win':
        // Celebratory fanfare: C5 → E5 → G5 → C6
        this.playTone(523.25, 0.15, 0, 'sine', 0.25);     // C5
        this.playTone(659.25, 0.15, 0.12, 'sine', 0.25);  // E5
        this.playTone(783.99, 0.15, 0.24, 'sine', 0.25);  // G5
        this.playTone(1046.5, 0.4, 0.36, 'sine', 0.3);    // C6
        break;

      case 'tick':
        // Subtle click
        this.playTone(800, 0.03, 0, 'square', 0.08);
        break;
    }
  }

  // Convenience methods
  playCorrect(): void { this.play('correct'); }
  playWrong(): void { this.play('wrong'); }
  playTurn(): void { this.play('turn'); }
  playWin(): void { this.play('win'); }
  playTick(): void { this.play('tick'); }
}

/** Singleton sound service. */
let instance: SoundService | null = null;

export function getSoundService(): SoundService {
  if (!instance) {
    instance = new SoundService();
  }
  return instance;
}

export type { SoundName };
