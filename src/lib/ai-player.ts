/**
 * AI player façade for the Nối Từ game.
 *
 * Routes word generation to either:
 *   1. **Gemini API** (when enabled + API key in .env), or
 *   2. **Dictionary** (local, offline, the default).
 *
 * If Gemini is tried but fails (network error, bad response, or the
 * returned word fails chain validation), the façade silently falls
 * back to the dictionary.  If even the dictionary has nothing, the
 * bot loses.
 */

import type { AIResponse } from '../types/game';
import type { Settings } from '../types/settings';
import { GEMINI_CONFIG } from './gemini-config';
import { findWordFromDictionary } from './ai-dictionary';
import { findWordFromGemini } from './ai-gemini';
import { normalizeVietnamese, isValidChain } from './vietnamese';

/**
 * Get a word from the AI player.
 */
export async function getAIWord(
  settings: Settings,
  lastSyllable: string,
  lastWord: string,
  chain: string[],
  usedWords: Set<string>,
): Promise<AIResponse> {
  // ── 1. Try Gemini if enabled + configured ───────────
  if (settings.geminiEnabled && GEMINI_CONFIG.isConfigured) {
    try {
      const result = await findWordFromGemini(
        GEMINI_CONFIG.apiKey,
        GEMINI_CONFIG.model,
        GEMINI_CONFIG.baseUrl,
        lastSyllable,
        chain,
        usedWords,
        settings.difficulty,
      );

      if (result.word) {
        const normalized = normalizeVietnamese(result.word);

        // Validate chain rule + uniqueness
        if (
          isValidChain(lastWord, result.word) &&
          !usedWords.has(normalized)
        ) {
          return { word: result.word, source: 'gemini' };
        }

        console.warn('Gemini word failed validation:', result.word);
      }
    } catch (err) {
      console.warn('Gemini failed, falling back to dictionary:', err);
    }
  }

  // ── 2. Dictionary (primary when Gemini is off, fallback otherwise)
  const word = await findWordFromDictionary(
    lastSyllable,
    usedWords,
    settings.difficulty,
  );

  if (word) {
    return { word, source: 'dictionary' };
  }

  // ── 3. Bot cannot find any word — loses ─────
  return {
    word: null,
    source: settings.geminiEnabled ? 'gemini' : 'dictionary',
  };
}
