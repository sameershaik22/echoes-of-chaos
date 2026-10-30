// ============================================================================
// ECHOES OF CHAOS — Web Audio Sound Engine
// ============================================================================
// Synthesized sound effects using Web Audio API (zero audio file downloads).
// Adheres to Amendment #10:
// - Unlocks AudioContext on first user gesture
// - Enabled by default with visible mute toggle
// - Handles browser autoplay policies safely
// ============================================================================

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.3;
  private unlocked: boolean = false;

  constructor() {
    // Read mute preference from localStorage
    try {
      const savedMute = localStorage.getItem('eoc_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
    } catch {
      // localStorage may fail in private mode
    }

    // Auto-unlock on first user interaction
    const unlockListener = () => {
      this.initContext();
      window.removeEventListener('click', unlockListener);
      window.removeEventListener('keydown', unlockListener);
      window.removeEventListener('touchstart', unlockListener);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('click', unlockListener, { once: true });
      window.addEventListener('keydown', unlockListener, { once: true });
      window.addEventListener('touchstart', unlockListener, { once: true });
    }
  }

  private initContext(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        this.unlocked = true;
      }
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('eoc_muted', String(this.isMuted));
    } catch {}
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
  }

  private playTone(freq: number, type: OscillatorType, duration: number, delay = 0): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(this.volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio playback fails silently if suspended
    }
  }

  public playClick(): void {
    this.playTone(800, 'sine', 0.05);
  }

  public playJoin(): void {
    this.playTone(523.25, 'sine', 0.1, 0);
    this.playTone(659.25, 'sine', 0.15, 0.08);
  }

  public playPhaseChange(): void {
    this.playTone(440, 'triangle', 0.1, 0);
    this.playTone(554.37, 'triangle', 0.1, 0.08);
    this.playTone(659.25, 'triangle', 0.2, 0.16);
  }

  public playCountdown(): void {
    this.playTone(440, 'square', 0.05);
  }

  public playPropose(): void {
    this.playTone(600, 'sine', 0.12);
  }

  public playConfirm(): void {
    this.playTone(750, 'sine', 0.1);
    this.playTone(900, 'sine', 0.15, 0.06);
  }

  public playLocked(): void {
    this.playTone(523.25, 'sawtooth', 0.1, 0);
    this.playTone(783.99, 'sawtooth', 0.25, 0.08);
  }

  public playVote(): void {
    this.playTone(400, 'triangle', 0.1);
  }

  public playCorrect(): void {
    this.playTone(523.25, 'sine', 0.12, 0);
    this.playTone(659.25, 'sine', 0.12, 0.1);
    this.playTone(783.99, 'sine', 0.15, 0.2);
    this.playTone(1046.5, 'sine', 0.35, 0.3);
  }

  public playWrong(): void {
    this.playTone(260, 'sawtooth', 0.18, 0);
    this.playTone(220, 'sawtooth', 0.3, 0.12);
  }

  public playVictory(): void {
    this.playTone(587.33, 'sine', 0.15, 0);
    this.playTone(739.99, 'sine', 0.15, 0.12);
    this.playTone(880.0, 'sine', 0.18, 0.24);
    this.playTone(1174.66, 'sine', 0.45, 0.36);
  }

  public playChat(): void {
    this.playTone(1200, 'sine', 0.04);
  }
}

export const soundEngine = new SoundEngine();
