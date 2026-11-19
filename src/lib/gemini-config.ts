/**
 * Gemini AI configuration — read from environment variables.
 *
 * These are set in .env (not committed) and loaded by Vite at build time.
 * The user only toggles AI on/off in the Settings UI; the actual
 * API key, base URL, and model are configured here.
 *
 * To change:  edit .env and restart `npm run dev`
 */

export const GEMINI_CONFIG = {
  apiKey: import.meta.env.VITE_GEMINI_API_KEY ?? '',
  baseUrl: import.meta.env.VITE_GEMINI_BASE_URL ?? 'https://api.apikey247.com/v1',
  model: import.meta.env.VITE_GEMINI_MODEL ?? 'gemini-3.8-flash-high',

  /** Whether the env has a valid API key configured */
  get isConfigured(): boolean {
    return this.apiKey.length > 0 && this.apiKey !== 'your_api_key_here';
  },
} as const;
