/**
 * localStorage wrapper with type safety.
 *
 * Keys:
 * - 'noitu-settings' — user preferences (AI mode, difficulty, voice, etc.)
 * - 'noitu-stats'    — lifetime game statistics
 *
 * All reads/writes are wrapped in try/catch for private-browsing safety
 * and forward compatibility (new fields get defaults via object spread).
 */

import type { Settings } from '../types/settings';
import type { GameStats } from '../types/game';
import { DEFAULT_SETTINGS } from '../types/settings';
import { DEFAULT_STATS } from '../types/game';

const SETTINGS_KEY = 'noitu-settings';
const STATS_KEY = 'noitu-stats';

// ────────────────────────────────────────────────────
// Settings
// ────────────────────────────────────────────────────

/** Load settings from localStorage, merged with defaults. */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    // Merge with defaults so new fields are picked up after upgrades
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Persist settings to localStorage. */
export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Silently fail — private browsing or quota exceeded
  }
}

// ────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────

/** Load game stats from localStorage, merged with defaults. */
export function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

/** Persist game stats to localStorage. */
export function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Silently fail
  }
}

/** Update stats after a game ends. */
export function updateStatsAfterGame(
  currentStats: GameStats,
  won: boolean,
  chainLength: number,
): GameStats {
  const updated: GameStats = {
    gamesPlayed: currentStats.gamesPlayed + 1,
    wins: currentStats.wins + (won ? 1 : 0),
    losses: currentStats.losses + (won ? 0 : 1),
    longestChain: Math.max(currentStats.longestChain, chainLength),
    totalWordsPlayed: currentStats.totalWordsPlayed + chainLength,
  };
  saveStats(updated);
  return updated;
}
