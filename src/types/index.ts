export type {
  GameStatus,
  Player,
  Difficulty,
  PlayedWord,
  GameState,
  ValidationResult,
  AIResponse,
  GameStats,
} from './game';

export { DEFAULT_STATS } from './game';

export type { Settings } from './settings';

export { DEFAULT_SETTINGS, DIFFICULTY_TIME_LIMITS } from './settings';

export type {
  SpeechRecognitionEvent,
  SpeechRecognitionResultList,
  SpeechRecognitionResult,
  SpeechRecognitionAlternative,
  SpeechRecognitionErrorEvent,
  ISpeechRecognition,
  SpeechRecognitionConstructor,
} from './speech';
