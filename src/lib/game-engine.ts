/**
 * Core game engine — pure functions, no side effects.
 *
 * Rules:
 * 1. Each word must be a Vietnamese compound word (≥ 2 syllables).
 * 2. The first syllable of a new word must match the last syllable of the
 *    previous word (exact, including diacritics).
 * 3. No word may be repeated within the same game.
 * 4. Each turn has a configurable time limit.
 *
 * Scoring:
 * - Base:   +10 per correct word
 * - Speed:  up to +5 bonus (answered within 5 s)
 * - Streak: +2 per consecutive correct answer
 */

import type { GameState, Player, PlayedWord, ValidationResult } from '../types/game';
import {
  normalizeVietnamese,
  getSyllables,
  getLastSyllable,
  isValidChain,
} from './vietnamese';

// ────────────────────────────────────────────────────
// Word validation
// ────────────────────────────────────────────────────

/**
 * Validate a submitted word against the current game state.
 *
 * @param word        The word the player submitted.
 * @param chain       Current chain of played words.
 * @param usedWords   Set of already-used words (normalized).
 * @param dictionary  Set of valid dictionary words (normalized).
 *                    Pass `null` to skip dictionary check (Gemini mode).
 */
export function validateWord(
  word: string,
  chain: PlayedWord[],
  usedWords: Set<string>,
  dictionary: Set<string> | null,
): ValidationResult {
  const normalized = normalizeVietnamese(word);
  const syllables = getSyllables(word);

  // 1. Must have at least 2 syllables (compound word)
  if (syllables.length < 2) {
    return {
      valid: false,
      reason: 'not_compound',
      message: 'Từ phải có ít nhất 2 âm tiết (ví dụ: "học sinh").',
    };
  }

  // 2. Must be in the dictionary (unless Gemini-validated)
  if (dictionary !== null && !dictionary.has(normalized)) {
    return {
      valid: false,
      reason: 'not_in_dictionary',
      message: `"${word}" không có trong từ điển. Thử từ khác nhé!`,
    };
  }

  // 3. Must follow the chain (if not the first word)
  if (chain.length > 0) {
    const lastWord = chain[chain.length - 1].word;
    if (!isValidChain(lastWord, word)) {
      const required = getLastSyllable(lastWord);
      return {
        valid: false,
        reason: 'wrong_syllable',
        message: `Từ phải bắt đầu bằng "${required}". Thử lại nào!`,
      };
    }
  }

  // 4. Must not have been used already
  if (usedWords.has(normalized)) {
    return {
      valid: false,
      reason: 'already_used',
      message: `"${word}" đã được dùng rồi. Nghĩ từ mới nhé!`,
    };
  }

  return { valid: true };
}

// ────────────────────────────────────────────────────
// Scoring
// ────────────────────────────────────────────────────

/** Speed bonus threshold in milliseconds (5 seconds). */
const SPEED_THRESHOLD_MS = 5_000;

/**
 * Calculate the score for a correct answer.
 *
 * @param turnDurationMs  How long the player took (milliseconds).
 * @param streak          Current consecutive-correct count BEFORE this word.
 * @returns Total score for this word.
 */
export function calculateScore(turnDurationMs: number, streak: number): number {
  const base = 10;

  // Speed bonus: linear from 5 (instant) to 0 (at threshold)
  const speedBonus =
    turnDurationMs < SPEED_THRESHOLD_MS
      ? Math.round(5 * (1 - turnDurationMs / SPEED_THRESHOLD_MS))
      : 0;

  // Streak bonus: +2 per consecutive correct answer
  const streakBonus = streak * 2;

  return base + speedBonus + streakBonus;
}

// ────────────────────────────────────────────────────
// Game helpers
// ────────────────────────────────────────────────────

/**
 * Get the syllable that the next word must start with.
 * Returns an empty string if no last word exists.
 */
export function getRequiredSyllable(lastWord: string): string {
  return getLastSyllable(lastWord);
}

/**
 * Pick a random starter word from the list.
 * Returns the first word if the list is empty (should never happen).
 */
export function getRandomStarter(starters: string[]): string {
  if (starters.length === 0) return 'bàn học'; // ultimate fallback
  const index = Math.floor(Math.random() * starters.length);
  return starters[index];
}

/**
 * Check whether the game is over.
 * The game ends when either player runs out of lives.
 */
export function checkGameOver(
  state: GameState,
): { isOver: false } | { isOver: true; winner: Player } {
  if (state.humanLives <= 0) {
    return { isOver: true, winner: 'bot' };
  }
  if (state.botLives <= 0) {
    return { isOver: true, winner: 'human' };
  }
  return { isOver: false };
}

// ────────────────────────────────────────────────────
// Initial state factory
// ────────────────────────────────────────────────────

/** Create a fresh GameState for a new game. */
export function createInitialState(
  difficulty: 'easy' | 'medium' | 'hard',
  turnTimeLimit: number,
  humanLives: number,
  botLives: number,
): GameState {
  return {
    status: 'idle',
    chain: [],
    currentPlayer: 'human',
    humanScore: 0,
    botScore: 0,
    humanLives,
    botLives,
    turnStartTime: 0,
    turnTimeLimit,
    streak: { human: 0, bot: 0 },
    difficulty,
    usedWords: new Set(),
    requiredSyllable: '',
    errorMessage: null,
  };
}
