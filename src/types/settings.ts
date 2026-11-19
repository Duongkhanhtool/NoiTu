import type { Difficulty } from './game';

/** TTS voice engine — Google Translate (natural) or browser native */
export type TTSSource = 'google' | 'browser';

/** Application settings — persisted to localStorage */
export interface Settings {
  // — AI Mode —
  /** Whether to use Gemini API for the bot (false = dictionary mode) */
  geminiEnabled: boolean;
  // API key, model, base URL are in .env (see src/lib/gemini-config.ts)

  // — Difficulty —
  difficulty: Difficulty;
  /** Seconds per turn (overridden by difficulty presets if not customized) */
  turnTimeLimit: number;

  // — Speech —
  /** Auto-read every new word aloud */
  ttsEnabled: boolean;
  /** Speech rate: 0.5 (slow) to 1.5 (fast), default 0.8 for children */
  ttsRate: number;
  /** TTS engine: 'google' (natural Vietnamese) or 'browser' (native voices) */
  ttsSource: TTSSource;
  /** Selected TTS voice URI, or null for browser default */
  ttsVoiceURI: string | null;

  // — Sound —
  /** Play sound effects (correct, wrong, win, etc.) */
  soundEnabled: boolean;

  // — Game Rules —
  /** Starting lives for the human player */
  humanLives: number;
  /** Starting lives for the bot */
  botLives: number;
  /** Whether the hint button is available */
  showHints: boolean;
}

/** Sensible defaults — easy mode, voice on, Gemini off */
export const DEFAULT_SETTINGS: Settings = {
  geminiEnabled: false,
  difficulty: 'easy',
  turnTimeLimit: 30,
  ttsEnabled: true,
  ttsRate: 0.8,
  ttsSource: 'google',
  ttsVoiceURI: null,
  soundEnabled: true,
  humanLives: 3,
  botLives: 3,
  showHints: true,
};

/** Time limits by difficulty (seconds) */
export const DIFFICULTY_TIME_LIMITS: Record<Difficulty, number> = {
  easy: 30,
  medium: 20,
  hard: 15,
};
