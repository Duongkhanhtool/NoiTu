/**
 * Vietnamese syllable processing for the Nối Từ game.
 *
 * Key design decisions:
 * - Syllable matching is EXACT, including all diacritics.
 *   "học" only matches "học", never "hoc" or "hóc".
 *   Vietnamese tones change meaning entirely (ma ≠ mã ≠ mà ≠ mả ≠ mạ).
 * - Unicode is normalized to NFC before comparison so that
 *   combining-character representations match precomposed ones.
 * - Case is ignored (lowercase both sides).
 */

// ────────────────────────────────────────────────────
// Syllable extraction
// ────────────────────────────────────────────────────

/** Split a compound word into its syllables (lowercase, trimmed). */
export function getSyllables(word: string): string[] {
  return normalizeVietnamese(word).split(/\s+/).filter(Boolean);
}

/** First syllable of a compound word. */
export function getFirstSyllable(word: string): string {
  return getSyllables(word)[0] ?? '';
}

/** Last syllable of a compound word. */
export function getLastSyllable(word: string): string {
  const syls = getSyllables(word);
  return syls[syls.length - 1] ?? '';
}

// ────────────────────────────────────────────────────
// Normalization
// ────────────────────────────────────────────────────

/**
 * Normalize Vietnamese text for comparison.
 * - Trim whitespace
 * - Lowercase
 * - NFC Unicode normalization (precomposed form)
 * - Collapse multiple spaces into one
 *
 * Does NOT strip diacritics — tones are semantically meaningful.
 */
export function normalizeVietnamese(text: string): string {
  return text.trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
}

// ────────────────────────────────────────────────────
// Chain validation
// ────────────────────────────────────────────────────

/**
 * Check whether `nextWord` can follow `prevWord` in the chain.
 * The first syllable of nextWord must exactly equal the last syllable of prevWord.
 */
export function isValidChain(prevWord: string, nextWord: string): boolean {
  const lastSyl = getLastSyllable(prevWord);
  const firstSyl = getFirstSyllable(nextWord);
  return lastSyl !== '' && firstSyl !== '' && lastSyl === firstSyl;
}

// ────────────────────────────────────────────────────
// Display helpers
// ────────────────────────────────────────────────────

/** Capitalize the first letter of each syllable for display. */
export function displayWord(word: string): string {
  return getSyllables(word)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// ────────────────────────────────────────────────────
// Diacritic stripping (fuzzy search only — never for chain matching!)
// ────────────────────────────────────────────────────

/**
 * Remove ALL Vietnamese diacritics (tone marks + vowel modifications).
 * Used ONLY for fuzzy search / STT error tolerance, not for chain validation.
 */
export function stripDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove combining marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// ────────────────────────────────────────────────────
// Fuzzy matching (for STT tolerance)
// ────────────────────────────────────────────────────

/**
 * Simple edit distance (Levenshtein) between two strings.
 * Used internally by fuzzyMatch.
 */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // Optimization: early exit on empty strings
  if (m === 0) return n;
  if (n === 0) return m;

  // Use single-row DP for memory efficiency
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,     // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    // Swap rows
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }

  return prev[n];
}

/**
 * Find the closest matches for `input` from a list of `candidates`.
 *
 * Strategy:
 * 1. Exact match (normalized) → return immediately.
 * 2. Stripped-diacritics exact match → strong candidate.
 * 3. Edit distance on stripped form → rank remaining.
 *
 * Returns up to `maxResults` candidates sorted best-first.
 */
export function fuzzyMatch(
  input: string,
  candidates: string[],
  maxResults: number = 5,
): string[] {
  const normalizedInput = normalizeVietnamese(input);
  const strippedInput = stripDiacritics(normalizedInput);

  // 1. Exact match — return immediately
  const exact = candidates.find(
    (c) => normalizeVietnamese(c) === normalizedInput,
  );
  if (exact) return [exact];

  // 2. Score every candidate
  const scored = candidates.map((candidate) => {
    const normalizedCandidate = normalizeVietnamese(candidate);
    const strippedCandidate = stripDiacritics(normalizedCandidate);

    // Stripped exact match gets a very low (good) distance
    if (strippedCandidate === strippedInput) {
      return { candidate, distance: 0.1 };
    }

    // Edit distance on the stripped forms
    const dist = editDistance(strippedInput, strippedCandidate);
    return { candidate, distance: dist };
  });

  // 3. Sort by distance, take top results
  scored.sort((a, b) => a.distance - b.distance);

  // Only return candidates within a reasonable distance
  const maxDistance = Math.max(2, Math.floor(strippedInput.length * 0.4));
  return scored
    .filter((s) => s.distance <= maxDistance)
    .slice(0, maxResults)
    .map((s) => s.candidate);
}
