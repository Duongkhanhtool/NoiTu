/**
 * Dictionary-based AI player for the Nối Từ game.
 *
 * Picks a word from the local dictionary index that starts with the
 * required syllable.  Three difficulty strategies control how
 * "smart" the bot plays and how long it pretends to think.
 *
 * This is the default (offline) mode — no network required.
 */

import { DICTIONARY_INDEX } from '../data/dictionary-index';
import { normalizeVietnamese, getLastSyllable } from './vietnamese';
import type { Difficulty } from '../types/game';

// ────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────

/**
 * Find a word from the dictionary that starts with `lastSyllable`.
 *
 * Strategy by difficulty:
 *
 * | Level  | Pick logic                              | Fake delay | Fail % |
 * |--------|-----------------------------------------|------------|--------|
 * | easy   | Random, prefer shorter / common words   | 2–4 s      | 10 %   |
 * | medium | Mildly strategic (fewer continuations)  | 1–3 s      | 0 %    |
 * | hard   | Most strategic (fewest continuations)   | 0.5–1.5 s  | 0 %    |
 *
 * @returns The chosen word (normalized), or `null` if the bot cannot
 *          find a valid word (= bot loses a life).
 */
export async function findWordFromDictionary(
  lastSyllable: string,
  usedWords: Set<string>,
  difficulty: Difficulty,
): Promise<string | null> {
  const normalized = normalizeVietnamese(lastSyllable);

  // All words whose first syllable matches
  const candidates = DICTIONARY_INDEX.get(normalized);
  if (!candidates || candidates.length === 0) return null;

  // Remove already-used words
  const available = candidates.filter(
    (w) => !usedWords.has(normalizeVietnamese(w)),
  );
  if (available.length === 0) return null;

  let chosen: string;

  switch (difficulty) {
    // ── Easy ──────────────────────────────────────────
    case 'easy': {
      // 10 % chance to deliberately fail so the kid can win
      if (Math.random() < 0.1) {
        await delay(randomBetween(2000, 4000));
        return null;
      }
      // Plain random pick
      chosen = available[Math.floor(Math.random() * available.length)];
      await delay(randomBetween(2000, 4000));
      break;
    }

    // ── Medium ────────────────────────────────────────
    case 'medium': {
      // Score each word by how few continuations its last syllable has
      // (harder for the player), then add randomness so it isn't
      // perfectly strategic.
      const scored = scoreByDifficulty(available, usedWords);
      scored.sort(
        (a, b) =>
          a.continuations - b.continuations + (Math.random() - 0.5) * 10,
      );
      // Pick from the top 3
      const topN = Math.min(3, scored.length);
      chosen = scored[Math.floor(Math.random() * topN)].word;
      await delay(randomBetween(1000, 3000));
      break;
    }

    // ── Hard ──────────────────────────────────────────
    case 'hard': {
      // Always pick the word whose last syllable leaves the fewest
      // valid continuations for the player.
      const scored = scoreByDifficulty(available, usedWords);
      scored.sort((a, b) => a.continuations - b.continuations);
      chosen = scored[0].word;
      await delay(randomBetween(500, 1500));
      break;
    }
  }

  return chosen;
}

// ────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────

interface ScoredWord {
  word: string;
  /** How many unused words can follow this one. */
  continuations: number;
}

/**
 * Score each candidate by how many unused continuations its last
 * syllable leads to.  Fewer continuations = harder for the player.
 */
function scoreByDifficulty(
  words: string[],
  usedWords: Set<string>,
): ScoredWord[] {
  return words.map((word) => {
    const ls = getLastSyllable(word);
    const nextOptions = DICTIONARY_INDEX.get(normalizeVietnamese(ls));
    const continuations = nextOptions
      ? nextOptions.filter((w) => !usedWords.has(normalizeVietnamese(w))).length
      : 0;
    return { word, continuations };
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
