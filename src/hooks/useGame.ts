/**
 * Main game state-machine hook for Nối Từ.
 *
 * Manages the full lifecycle: start → human turn ↔ bot turn → game over.
 *
 * The turn timer ticks every second. On timeout the current player loses
 * a life and the turn switches. The bot turn is fully automated: it calls
 * the AI player (dictionary or Gemini, depending on settings) and either
 * adds the word to the chain or loses a life.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameState, PlayedWord, Player } from '../types/game';
import { DEFAULT_SETTINGS } from '../types/settings';
import type { Settings as FullSettings } from '../types/settings';
import {
  validateWord,
  calculateScore,
  getRequiredSyllable,
  getRandomStarter,
  checkGameOver,
  createInitialState,
} from '../lib/game-engine';
import { normalizeVietnamese, getLastSyllable } from '../lib/vietnamese';
import { WORD_SET } from '../data/dictionary-index';
import { STARTER_WORDS } from '../data/common-words';
import { getAIWord } from '../lib/ai-player';

// ── The Settings type from App.tsx (simpler than the full type) ──

interface AppSettings {
  geminiEnabled: boolean;
  geminiApiKey: string;
  difficulty: 'easy' | 'medium' | 'hard';
  turnTimeLimit: number;
  ttsEnabled: boolean;
  ttsRate: number;
  soundEnabled: boolean;
  showHints: boolean;
}

// ── Return type ──

export interface UseGameReturn {
  state: GameState;
  /** Submit a word on the human's turn. */
  submitWord: (word: string, wasSpoken: boolean) => void;
  /** Start a new game (or restart). */
  startGame: () => void;
  /** Reset back to idle screen. */
  resetGame: () => void;
  /** Seconds remaining in the current turn. */
  timeLeft: number;
  /** True while the bot is thinking (prevents double-submit). */
  isSubmitting: boolean;
}

// ── Hook ──

export function useGame(settings: AppSettings): UseGameReturn {
  const [state, setState] = useState<GameState>(() =>
    createInitialState(settings.difficulty, settings.turnTimeLimit, 3, 3),
  );
  const [timeLeft, setTimeLeft] = useState(settings.turnTimeLimit);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs that shouldn't trigger re-renders
  const isMounted = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsRef = useRef(settings);
  const stateRef = useRef(state);

  // Keep refs in sync
  settingsRef.current = settings;
  stateRef.current = state;

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearTimer();
    };
  }, []);

  // ─── Timer ─────────────────────────────────────────

  function clearTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer(seconds: number) {
    clearTimer();
    setTimeLeft(seconds);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          // Timeout — handle on next tick to avoid setState-in-setState
          setTimeout(() => handleTimeout(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // ─── Timeout handler ──────────────────────────────

  function handleTimeout() {
    if (!isMounted.current) return;
    const s = stateRef.current;
    if (s.status !== 'playing') return;

    setState((prev) => {
      const player = prev.currentPlayer;
      const newLives =
        player === 'human'
          ? { humanLives: prev.humanLives - 1 }
          : { botLives: prev.botLives - 1 };

      const resetStreak =
        player === 'human'
          ? { streak: { ...prev.streak, human: 0 } }
          : { streak: { ...prev.streak, bot: 0 } };

      const updated: GameState = {
        ...prev,
        ...newLives,
        ...resetStreak,
        errorMessage:
          player === 'human' ? 'Hết giờ! Bạn mất 1 mạng.' : 'Bot hết giờ! Bot mất 1 mạng.',
      };

      // Check game over
      const result = checkGameOver(updated);
      if (result.isOver) {
        return { ...updated, status: 'finished' };
      }

      // Switch turn
      const nextPlayer: Player = player === 'human' ? 'bot' : 'human';
      return { ...updated, currentPlayer: nextPlayer };
    });
  }

  // ─── When currentPlayer or status changes, manage timer & bot turn ───

  useEffect(() => {
    if (state.status !== 'playing') {
      clearTimer();
      return;
    }

    // Start a fresh timer for the new turn
    startTimer(settingsRef.current.turnTimeLimit);

    // If it's the bot's turn, trigger the AI
    if (state.currentPlayer === 'bot') {
      runBotTurn();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentPlayer, state.status]);

  // ─── Bot turn ──────────────────────────────────────

  async function runBotTurn() {
    if (!isMounted.current) return;
    setIsSubmitting(true);

    const s = stateRef.current;
    const cfg = settingsRef.current;

    // Build the full Settings object the AI player expects
    const fullSettings: FullSettings = {
      ...DEFAULT_SETTINGS,
      ...cfg,
    };

    const lastWord = s.chain.length > 0 ? s.chain[s.chain.length - 1].word : '';
    const requiredSyl = s.requiredSyllable;
    const chainWords = s.chain.map((w) => w.word);

    // Note: ai-dictionary.ts already has built-in "thinking" delays
    // per difficulty level, so no extra delay is needed here.

    try {
      const response = await getAIWord(
        fullSettings,
        requiredSyl,
        lastWord,
        chainWords,
        s.usedWords,
      );

      if (!isMounted.current) return;

      if (response.word) {
        // Bot found a word — add it to the chain
        addWordToChain(response.word, 'bot', false);
      } else {
        // Bot can't find a word — loses a life
        setState((prev) => {
          const updated: GameState = {
            ...prev,
            botLives: prev.botLives - 1,
            streak: { ...prev.streak, bot: 0 },
            errorMessage: 'Bot không tìm được từ! Bot mất 1 mạng.',
          };
          const result = checkGameOver(updated);
          if (result.isOver) {
            return { ...updated, status: 'finished' };
          }
          return { ...updated, currentPlayer: 'human' };
        });
      }
    } catch {
      if (!isMounted.current) return;
      // On error, bot loses a life
      setState((prev) => {
        const updated: GameState = {
          ...prev,
          botLives: prev.botLives - 1,
          streak: { ...prev.streak, bot: 0 },
          errorMessage: 'Bot gặp lỗi! Bot mất 1 mạng.',
        };
        const result = checkGameOver(updated);
        if (result.isOver) {
          return { ...updated, status: 'finished' };
        }
        return { ...updated, currentPlayer: 'human' };
      });
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  }

  // ─── Add word to chain (shared by human and bot) ──

  function addWordToChain(word: string, player: Player, wasSpoken: boolean) {
    setState((prev) => {
      const turnDuration = Date.now() - prev.turnStartTime;
      const streak = prev.streak[player];
      const score = calculateScore(turnDuration, streak);

      const playedWord: PlayedWord = {
        word: normalizeVietnamese(word),
        player,
        timestamp: Date.now(),
        score,
        wasSpoken,
      };

      const newChain = [...prev.chain, playedWord];
      const newUsed = new Set(prev.usedWords);
      newUsed.add(normalizeVietnamese(word));

      const nextSyllable = getLastSyllable(word);
      const nextPlayer: Player = player === 'human' ? 'bot' : 'human';

      const updated: GameState = {
        ...prev,
        chain: newChain,
        usedWords: newUsed,
        requiredSyllable: nextSyllable,
        humanScore: player === 'human' ? prev.humanScore + score : prev.humanScore,
        botScore: player === 'bot' ? prev.botScore + score : prev.botScore,
        streak: {
          ...prev.streak,
          [player]: prev.streak[player] + 1,
        },
        errorMessage: null,
        currentPlayer: nextPlayer,
        turnStartTime: Date.now(),
      };

      // Check game over
      const result = checkGameOver(updated);
      if (result.isOver) {
        return { ...updated, status: 'finished' };
      }

      return updated;
    });
  }

  // ─── Public: submit human word ─────────────────────

  const submitWord = useCallback(
    (word: string, wasSpoken: boolean) => {
      const s = stateRef.current;
      if (s.status !== 'playing' || s.currentPlayer !== 'human' || isSubmitting) {
        return;
      }

      const validation = validateWord(word, s.chain, s.usedWords, WORD_SET);

      if (!validation.valid) {
        setState((prev) => ({ ...prev, errorMessage: validation.message }));
        return;
      }

      // Valid word — stop the timer and add it
      clearTimer();
      addWordToChain(word, 'human', wasSpoken);
    },
    [isSubmitting],
  );

  // ─── Public: start game ────────────────────────────

  const startGame = useCallback(() => {
    const cfg = settingsRef.current;
    const initial = createInitialState(cfg.difficulty, cfg.turnTimeLimit, 3, 3);

    // Pick a random starter word (bot goes first)
    const starterWord = getRandomStarter(STARTER_WORDS);
    const starterPlayed: PlayedWord = {
      word: normalizeVietnamese(starterWord),
      player: 'bot',
      timestamp: Date.now(),
      score: 0,
      wasSpoken: false,
    };

    const usedWords = new Set<string>();
    usedWords.add(normalizeVietnamese(starterWord));

    const gameState: GameState = {
      ...initial,
      status: 'playing',
      chain: [starterPlayed],
      usedWords,
      currentPlayer: 'human',
      requiredSyllable: getRequiredSyllable(starterWord),
      turnStartTime: Date.now(),
    };

    setState(gameState);
    setTimeLeft(cfg.turnTimeLimit);
    setIsSubmitting(false);
  }, []);

  // ─── Public: reset to idle ─────────────────────────

  const resetGame = useCallback(() => {
    clearTimer();
    const cfg = settingsRef.current;
    setState(createInitialState(cfg.difficulty, cfg.turnTimeLimit, 3, 3));
    setTimeLeft(cfg.turnTimeLimit);
    setIsSubmitting(false);
  }, []);

  return { state, submitWord, startGame, resetGame, timeLeft, isSubmitting };
}
