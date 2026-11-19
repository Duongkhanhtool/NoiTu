/** Game status lifecycle */
export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';

/** Which player is acting */
export type Player = 'human' | 'bot';

/** Difficulty levels — affects bot strategy, timer, and hints */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** A word that has been played in the chain */
export interface PlayedWord {
  /** The compound word (e.g. "học sinh") */
  word: string;
  /** Who played this word */
  player: Player;
  /** Unix timestamp when the word was submitted */
  timestamp: number;
  /** Points scored for this word */
  score: number;
  /** Whether the word was entered via voice input */
  wasSpoken: boolean;
}

/** Full game state */
export interface GameState {
  status: GameStatus;
  /** Ordered list of all words played */
  chain: PlayedWord[];
  currentPlayer: Player;
  humanScore: number;
  botScore: number;
  humanLives: number;
  botLives: number;
  /** Timestamp when current turn started (for speed bonus) */
  turnStartTime: number;
  /** Seconds allowed per turn */
  turnTimeLimit: number;
  /** Consecutive correct answers per player */
  streak: { human: number; bot: number };
  difficulty: Difficulty;
  /** Set of normalized words already used (prevents repeats) */
  usedWords: Set<string>;
  /** The syllable the next word must start with */
  requiredSyllable: string;
  /** Current error message to display, or null */
  errorMessage: string | null;
}

/** Result of validating a submitted word */
export type ValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | 'not_compound'
        | 'not_in_dictionary'
        | 'wrong_syllable'
        | 'already_used'
        | 'timeout';
      /** Vietnamese message for display */
      message: string;
    };

/** Response from the AI player (dictionary or Gemini) */
export interface AIResponse {
  word: string | null;
  source: 'dictionary' | 'gemini';
  error?: string;
}

/** Persistent player statistics */
export interface GameStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  longestChain: number;
  totalWordsPlayed: number;
}

/** Default stats for a new player */
export const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  longestChain: 0,
  totalWordsPlayed: 0,
};
