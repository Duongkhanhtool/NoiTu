# Nối Từ — Vietnamese Word Chain Game

A web-based Vietnamese word chain (nối từ) game with voice support, built for children.

## Tech Stack
- React 19 + TypeScript + Vite 6
- Tailwind CSS 3.4
- Web Speech API (TTS + STT)
- Optional: Gemini API for AI opponent

## Run
```bash
npm install
npm run dev
```

## Rules
- Vietnamese syllable matching is **EXACT** — diacritics matter.
- "học" ≠ "hoc" ≠ "hóc" — tones change meaning entirely.
- Words must be compound Vietnamese words (từ ghép, 2+ syllables).
- Next word's first syllable must match previous word's last syllable.

## AI Modes
- **Dictionary mode** (default): Bot picks from local word list.
- **Gemini mode** (toggle ON in settings): Uses Gemini 2.0 Flash API. Requires API key.
