/**
 * Pre-built inverted index for the Vietnamese word dictionary.
 *
 * Merges the base dictionary (~1,200 words) with all extra batches
 * (~4,000 words) into a single deduplicated index.
 *
 * DICTIONARY_INDEX — Maps a normalised first syllable to all words
 *   that begin with that syllable.  Used by the offline AI bot to
 *   find valid next words in O(1).
 *
 * WORD_SET — A Set of every normalised word for O(1) existence checks
 *   during validation ("is this a real word in our dictionary?").
 *
 * ALL_WORDS — The merged, deduplicated word list.
 *
 * All structures are built once at module load time and cached.
 */

import { DICTIONARY } from './dictionary';
import { DICTIONARY_EXTRA_1 } from './dictionary-extra-1';
import { DICTIONARY_EXTRA_2 } from './dictionary-extra-2';
import { DICTIONARY_EXTRA_3 } from './dictionary-extra-3';
import { DICTIONARY_EXTRA_4 } from './dictionary-extra-4';
import { getFirstSyllable, normalizeVietnamese } from '../lib/vietnamese';

// ── Types ─────────────────────────────────────────────────────

export type DictionaryIndex = Map<string, string[]>;

// ── Merge & deduplicate ───────────────────────────────────────

function mergeAndDeduplicate(...arrays: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const arr of arrays) {
    for (const raw of arr) {
      const normalized = normalizeVietnamese(raw);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

/** All words from base + extra batches, deduplicated */
export const ALL_WORDS: string[] = mergeAndDeduplicate(
  DICTIONARY,
  DICTIONARY_EXTRA_1,
  DICTIONARY_EXTRA_2,
  DICTIONARY_EXTRA_3,
  DICTIONARY_EXTRA_4,
);

// ── Builder ───────────────────────────────────────────────────

/**
 * Build the inverted index: firstSyllable → words[].
 */
export function buildDictionaryIndex(words: string[] = ALL_WORDS): DictionaryIndex {
  const index: DictionaryIndex = new Map();

  for (const word of words) {
    const first = getFirstSyllable(word);
    if (!first) continue;

    const list = index.get(first);
    if (list) {
      list.push(word);
    } else {
      index.set(first, [word]);
    }
  }

  return index;
}

/**
 * Build a Set of all normalised words for O(1) lookup.
 */
function buildWordSet(words: string[] = ALL_WORDS): Set<string> {
  return new Set(words);
}

// ── Singletons (built once at import time) ────────────────────

/** firstSyllable → word[] */
export const DICTIONARY_INDEX: DictionaryIndex = buildDictionaryIndex();

/** Set of every normalised word in the dictionary. */
export const WORD_SET: Set<string> = buildWordSet();
