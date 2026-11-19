/**
 * Proxy server URL — used by TTS and AI API modules.
 *
 * In development: http://localhost:3001 (local proxy)
 * In production: the Render/Railway URL (set via VITE_PROXY_URL env var)
 */
export const PROXY_URL: string =
  import.meta.env.VITE_PROXY_URL ?? 'http://localhost:3001';
