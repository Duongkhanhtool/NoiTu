import { useState, useEffect, useCallback, useRef } from 'react'
import { useSettings } from '../../App'
import { ScoreBoard } from '../game/ScoreBoard'
import { WordChain } from '../game/WordChain'
import { CurrentTurn } from '../game/CurrentTurn'
import { BotThinking } from '../game/BotThinking'
import { InputArea } from '../game/InputArea'
import { HintButton } from '../game/HintButton'
import { SettingsModal } from '../settings/SettingsModal'
import { getTTSService } from '../../lib/tts'
import { STTService } from '../../lib/stt'
import { getSoundService } from '../../lib/sound'
import { GEMINI_CONFIG } from '../../lib/gemini-config'
import { PROXY_URL } from '../../lib/proxy-config'
import { validateWord, calculateScore, getRandomStarter, getRequiredSyllable } from '../../lib/game-engine'
import { getLastSyllable, normalizeVietnamese } from '../../lib/vietnamese'
import { DICTIONARY_INDEX, WORD_SET } from '../../data/dictionary-index'
import { STARTER_WORDS } from '../../data/common-words'
import type { GameState, PlayedWord } from '../../types/game'

interface GameScreenProps {
  onFinish: (humanScore: number, botScore: number, chainLength: number) => void
  onHome: () => void
}

export function GameScreen({ onFinish, onHome }: GameScreenProps) {
  const { settings } = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)

  // ── Game state ──
  const [state, setState] = useState<GameState>(() => ({
    status: 'idle',
    chain: [],
    currentPlayer: 'human',
    humanScore: 0,
    botScore: 0,
    humanLives: settings.humanLives ?? 3,
    botLives: settings.botLives ?? 3,
    turnStartTime: Date.now(),
    turnTimeLimit: settings.turnTimeLimit,
    streak: { human: 0, bot: 0 },
    difficulty: settings.difficulty,
    usedWords: new Set<string>(),
    requiredSyllable: '',
    errorMessage: null,
  }))

  // ── Timer ──
  const [timeLeft, setTimeLeft] = useState(settings.turnTimeLimit)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── STT ──
  const sttRef = useRef<STTService | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const sttSupported = useRef(false)

  // ── AI validation ──
  const [isValidating, setIsValidating] = useState(false)

  // ── Refs for callbacks to access latest state ──
  const stateRef = useRef(state)
  stateRef.current = state

  // ── Helper: speak a message aloud (for players who can't read) ──
  const speakMessage = useCallback((message: string) => {
    if (settings.ttsEnabled) {
      const tts = getTTSService()
      tts.setRate(settings.ttsRate)
      tts.setSource(settings.ttsSource ?? 'google')
      // Strip emoji for cleaner TTS
      const clean = message.replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/gu, '').trim()
      tts.speak(clean)
    }
  }, [settings.ttsEnabled, settings.ttsRate, settings.ttsSource])

  // ── Helper: set error message AND read it aloud ──
  const setErrorAndSpeak = useCallback((message: string) => {
    setState((prev) => ({ ...prev, errorMessage: message }))
    speakMessage(message)
  }, [speakMessage])

  // Initialize STT
  useEffect(() => {
    sttRef.current = new STTService()
    sttSupported.current = sttRef.current.isSupported()
    return () => sttRef.current?.destroy()
  }, [])

  // ── Start the game on mount ──
  useEffect(() => {
    startGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startGame = useCallback(() => {
    const starter = getRandomStarter(STARTER_WORDS)
    const starterWord: PlayedWord = {
      word: starter,
      player: 'bot', // bot starts with the first word
      timestamp: Date.now(),
      score: 0,
      wasSpoken: false,
    }
    const requiredSyllable = getLastSyllable(starter)

    setState({
      status: 'playing',
      chain: [starterWord],
      currentPlayer: 'human',
      humanScore: 0,
      botScore: 0,
      humanLives: settings.humanLives ?? 3,
      botLives: settings.botLives ?? 3,
      turnStartTime: Date.now(),
      turnTimeLimit: settings.turnTimeLimit,
      streak: { human: 0, bot: 0 },
      difficulty: settings.difficulty,
      usedWords: new Set([normalizeVietnamese(starter)]),
      requiredSyllable,
      errorMessage: null,
    })
    setTimeLeft(settings.turnTimeLimit)

    // Speak the starter word
    if (settings.ttsEnabled) {
      const tts = getTTSService()
      tts.setRate(settings.ttsRate)
      tts.setSource(settings.ttsSource ?? 'google')
      tts.speak(starter)
    }
  }, [settings])

  // ── Timer countdown ──
  // Pauses while AI is validating a word — don't penalize network latency
  useEffect(() => {
    if (state.status !== 'playing' || isValidating) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up!
          handleTimeout()
          return 0
        }
        // Warning tick sound
        if (prev <= 6 && settings.soundEnabled) {
          getSoundService().playTick()
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.currentPlayer, state.chain.length, isValidating])

  // ── Handle timeout ──
  const handleTimeout = useCallback(() => {
    const s = stateRef.current
    if (s.status !== 'playing') return

    const player = s.currentPlayer
    if (settings.soundEnabled) getSoundService().playWrong()

    const message = player === 'human' ? 'Hết giờ! Bạn thua rồi ⏰' : 'Bot hết giờ! Bạn thắng 🎉'

    // Timeout = instant loss for whoever ran out of time
    setState((prev) => ({
      ...prev,
      status: 'finished',
      errorMessage: message,
      humanLives: player === 'human' ? 0 : prev.humanLives,
      botLives: player === 'bot' ? 0 : prev.botLives,
    }))
    speakMessage(message)
  }, [settings])

  // ── Submit a word (human) ──
  const handleSubmitWord = useCallback(
    async (word: string, wasSpoken: boolean) => {
      const s = stateRef.current
      if (s.status !== 'playing' || s.currentPlayer !== 'human' || isValidating) return

      // Step 1: Basic validation (syllable count, chain rule, not used)
      // For offline: also check dictionary. For AI: skip dictionary here.
      const dictionary = settings.geminiEnabled ? null : WORD_SET
      const result = validateWord(word, s.chain, s.usedWords, dictionary)
      if (!result.valid) {
        setErrorAndSpeak(result.message)
        if (settings.soundEnabled) getSoundService().playWrong()
        return
      }

      // Step 2: If AI mode, ask Gemini to verify the word is real Vietnamese
      if (settings.geminiEnabled && GEMINI_CONFIG.isConfigured) {
        setIsValidating(true)
        setState((prev) => ({ ...prev, errorMessage: null }))

        try {
          const isValid = await validateWordWithAI(
            GEMINI_CONFIG.apiKey,
            GEMINI_CONFIG.model,
            GEMINI_CONFIG.baseUrl,
            word,
          )

          // Check if game state is still valid (player might have timed out)
          const currentState = stateRef.current
          if (currentState.status !== 'playing' || currentState.currentPlayer !== 'human') {
            setIsValidating(false)
            return
          }

          if (!isValid) {
            const msg = `"${word}" không phải từ tiếng Việt hợp lệ. Thử từ khác nhé!`
            setErrorAndSpeak(msg)
            if (settings.soundEnabled) getSoundService().playWrong()
            setIsValidating(false)
            return
          }
        } catch {
          // If AI validation fails (network etc), accept the word
          console.warn('AI validation failed, accepting word')
        }
        setIsValidating(false)
      }

      // Step 3: Word is valid — add to chain
      const turnDuration = Date.now() - s.turnStartTime
      const score = calculateScore(turnDuration, s.streak.human)

      const playedWord: PlayedWord = {
        word: normalizeVietnamese(word),
        player: 'human',
        timestamp: Date.now(),
        score,
        wasSpoken,
      }

      if (settings.soundEnabled) getSoundService().playCorrect()
      if (settings.ttsEnabled) {
        const tts = getTTSService()
        tts.setRate(settings.ttsRate)
        tts.setSource(settings.ttsSource ?? 'google')
        tts.speak(word)
      }

      const newRequired = getRequiredSyllable(word)

      setState((prev) => ({
        ...prev,
        chain: [...prev.chain, playedWord],
        humanScore: prev.humanScore + score,
        currentPlayer: 'bot',
        turnStartTime: Date.now(),
        streak: { ...prev.streak, human: prev.streak.human + 1 },
        usedWords: new Set([...prev.usedWords, normalizeVietnamese(word)]),
        requiredSyllable: newRequired,
        errorMessage: null,
      }))
      setTimeLeft(settings.turnTimeLimit)

      // Stop listening if was using STT
      if (isListening) {
        sttRef.current?.stop()
        setIsListening(false)
        setInterimTranscript('')
      }
    },
    [settings, isListening],
  )

  // ── Bot turn ──
  useEffect(() => {
    if (state.status !== 'playing' || state.currentPlayer !== 'bot') return

    const delay = state.difficulty === 'easy' ? 2500 : state.difficulty === 'medium' ? 1800 : 1000
    const jitter = Math.random() * 1000

    const timeout = setTimeout(() => {
      botPlay()
    }, delay + jitter)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentPlayer, state.chain.length, state.status])

  const botPlay = useCallback(async () => {
    const s = stateRef.current
    if (s.status !== 'playing' || s.currentPlayer !== 'bot') return

    const normalizedSyllable = normalizeVietnamese(s.requiredSyllable)
    let botWord: string | null = null

    // Try Gemini first if enabled
    if (settings.geminiEnabled && GEMINI_CONFIG.isConfigured) {
      try {
        botWord = await callGeminiForWord(
          GEMINI_CONFIG.apiKey,
          GEMINI_CONFIG.model,
          GEMINI_CONFIG.baseUrl,
          s.requiredSyllable,
          s.chain.map((w) => w.word),
          s.usedWords,
          s.difficulty,
        )
      } catch {
        // Fall through to dictionary
      }
    }

    // Dictionary fallback
    if (!botWord) {
      const available = DICTIONARY_INDEX.get(normalizedSyllable) ?? []
      const unused = available.filter((w) => !s.usedWords.has(normalizeVietnamese(w)))

      if (unused.length > 0) {
        if (s.difficulty === 'hard') {
          // Pick word with fewest follow-ups (strategic)
          botWord = unused.reduce((best, w) => {
            const lastSyl = normalizeVietnamese(getLastSyllable(w))
            const followUps = (DICTIONARY_INDEX.get(lastSyl) ?? []).filter(
              (fw) => !s.usedWords.has(normalizeVietnamese(fw)),
            ).length
            const bestLastSyl = normalizeVietnamese(getLastSyllable(best))
            const bestFollowUps = (DICTIONARY_INDEX.get(bestLastSyl) ?? []).filter(
              (fw) => !s.usedWords.has(normalizeVietnamese(fw)),
            ).length
            return followUps < bestFollowUps ? w : best
          })
        } else if (s.difficulty === 'easy') {
          // Random pick, with 10% chance to "fail" for fun
          if (Math.random() < 0.1 && unused.length > 0) {
            // Pretend to fail — but only if we have more than 5 options (don't be mean when scarce)
            if (unused.length <= 5) {
              botWord = unused[Math.floor(Math.random() * unused.length)]
            } else {
              botWord = null // Bot "can't think of one"
            }
          } else {
            botWord = unused[Math.floor(Math.random() * unused.length)]
          }
        } else {
          botWord = unused[Math.floor(Math.random() * unused.length)]
        }
      }
    }

    if (botWord) {
      const turnDuration = Date.now() - s.turnStartTime
      const score = calculateScore(turnDuration, s.streak.bot)
      const playedWord: PlayedWord = {
        word: botWord,
        player: 'bot',
        timestamp: Date.now(),
        score,
        wasSpoken: false,
      }

      if (settings.soundEnabled) getSoundService().playCorrect()
      if (settings.ttsEnabled) {
        const tts = getTTSService()
        tts.setRate(settings.ttsRate)
        tts.setSource(settings.ttsSource ?? 'google')
        setTimeout(() => tts.speak(botWord!), 300)
      }

      const newRequired = getRequiredSyllable(botWord)

      setState((prev) => ({
        ...prev,
        chain: [...prev.chain, playedWord],
        botScore: prev.botScore + score,
        currentPlayer: 'human',
        turnStartTime: Date.now(),
        streak: { ...prev.streak, bot: prev.streak.bot + 1 },
        usedWords: new Set([...prev.usedWords, normalizeVietnamese(botWord!)]),
        requiredSyllable: newRequired,
        errorMessage: null,
      }))
      setTimeLeft(settings.turnTimeLimit)
    } else {
      // Bot can't find a word — bot loses instantly
      if (settings.soundEnabled) getSoundService().playWrong()

      const msg = 'Bot không nghĩ ra từ nào! Bạn thắng 🎉'
      setState((prev) => ({
        ...prev,
        status: 'finished',
        botLives: 0,
        errorMessage: msg,
      }))
      speakMessage(msg)
    }
  }, [settings])

  // ── Detect game over → navigate ──
  useEffect(() => {
    if (state.status === 'finished') {
      if (settings.soundEnabled) {
        const winner = state.humanLives > 0 ? 'human' : 'bot'
        if (winner === 'human') {
          getSoundService().playWin()
        }
      }
      const timeout = setTimeout(() => {
        onFinish(state.humanScore, state.botScore, state.chain.length)
      }, 1500)
      return () => clearTimeout(timeout)
    }
  }, [state.status, state.humanScore, state.botScore, state.chain.length, onFinish, settings.soundEnabled, state.humanLives])

  // ── TTS speak word ──
  const handleSpeakWord = useCallback(
    (word: string) => {
      const tts = getTTSService()
      tts.setRate(settings.ttsRate)
      tts.setSource(settings.ttsSource ?? 'google')
      tts.speak(word)
    },
    [settings.ttsRate, settings.ttsSource],
  )

  // ── STT mic toggle ──
  const handleMicToggle = useCallback(() => {
    if (!sttRef.current) return

    if (isListening) {
      sttRef.current.stop()
      setIsListening(false)
      return
    }

    // Cancel any TTS first
    getTTSService().cancel()

    setInterimTranscript('')
    sttRef.current.start({
      onResult: (transcript, isFinal) => {
        setInterimTranscript(transcript)
        if (isFinal) {
          setIsListening(false)
        }
      },
      onError: (error) => {
        setErrorAndSpeak(error)
        setIsListening(false)
      },
      onEnd: () => {
        setIsListening(false)
      },
    })
    setIsListening(true)
  }, [isListening])

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gradient-kids">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <button
          onClick={onHome}
          className="w-12 h-12 rounded-full glass flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-sm"
          aria-label="Về trang chủ"
        >
          <span className="text-xl">🏠</span>
        </button>

        {/* AI mode badge */}
        <div
          className={`px-4 py-1.5 rounded-full text-sm font-display font-bold flex items-center gap-2 ${
            settings.geminiEnabled
              ? 'bg-game-grape/15 text-game-grape'
              : 'bg-game-ocean/15 text-game-ocean'
          }`}
        >
          <span className="text-lg">{settings.geminiEnabled ? '🤖' : '📚'}</span>
          <span>{settings.geminiEnabled ? 'AI' : 'Offline'}</span>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          className="w-12 h-12 rounded-full glass flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-sm"
          aria-label="Cài đặt"
        >
          <span className="text-xl">⚙️</span>
        </button>
      </div>

      {/* Score board */}
      <ScoreBoard
        humanScore={state.humanScore}
        botScore={state.botScore}
        humanLives={state.humanLives}
        botLives={state.botLives}
      />

      {/* Word chain (scrollable, takes remaining space) */}
      <WordChain chain={state.chain} onSpeakWord={handleSpeakWord} />

      {/* Current turn / timer */}
      {state.status === 'playing' && (
        <CurrentTurn
          currentPlayer={state.currentPlayer}
          requiredSyllable={state.requiredSyllable}
          timeLeft={timeLeft}
          turnTimeLimit={state.turnTimeLimit}
        />
      )}

      {/* Bot thinking */}
      <BotThinking isThinking={state.status === 'playing' && state.currentPlayer === 'bot'} />

      {/* Input area (human turn only) */}
      {state.status === 'playing' && state.currentPlayer === 'human' && (
        <>
          <InputArea
            onSubmit={handleSubmitWord}
            requiredSyllable={state.requiredSyllable}
            disabled={state.status !== 'playing' || state.currentPlayer !== 'human' || isValidating}
            errorMessage={isValidating ? '🔍 Đang kiểm tra từ...' : state.errorMessage}
            sttSupported={sttSupported.current}
            onMicToggle={handleMicToggle}
            isListening={isListening}
            interimTranscript={interimTranscript}
          />
          <HintButton
            requiredSyllable={state.requiredSyllable}
            usedWords={state.usedWords}
            visible={settings.showHints}
          />
        </>
      )}

      {/* Game over overlay */}
      {state.status === 'finished' && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-40 animate-slide-up">
          <div className="text-center space-y-4 p-8">
            <div className="text-8xl animate-bounce-in">
              {state.humanLives > 0 ? '🏆' : '💪'}
            </div>
            <p className="text-4xl font-display font-extrabold text-white drop-shadow-lg">
              {state.humanLives > 0 ? (
                <span className="text-rainbow">GIỎI QUÁ!</span>
              ) : (
                'Cố lên nhé! 😊'
              )}
            </p>
          </div>
        </div>
      )}

      {/* Settings modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

// ── Gemini API call (via proxy) ──
async function callGeminiForWord(
  apiKey: string,
  model: string,
  baseUrl: string,
  requiredSyllable: string,
  chain: string[],
  usedWords: Set<string>,
  difficulty: string,
): Promise<string | null> {
  const usedList = [...usedWords].slice(-20).join(', ')
  const difficultyHint =
    difficulty === 'easy'
      ? 'Chọn từ đơn giản, phổ biến mà trẻ em biết.'
      : difficulty === 'hard'
        ? 'Chọn từ khó, ít phổ biến để thử thách người chơi.'
        : ''

  const systemPrompt = `Bạn đang chơi trò Nối Từ tiếng Việt.
Luật: mỗi từ phải bắt đầu bằng âm tiết cuối của từ trước.
Từ phải là từ ghép tiếng Việt có nghĩa (2 âm tiết trở lên).
CHỈ trả lời DUY NHẤT từ ghép (viết thường), KHÔNG giải thích.`

  const userPrompt = `Chuỗi từ hiện tại: ${chain.slice(-5).join(' → ')}

Hãy nối một từ bắt đầu bằng "${requiredSyllable}".
Các từ đã dùng (không được lặp): ${usedList}
${difficultyHint}`

  const res = await fetch(`${PROXY_URL}/api/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      baseUrl,
      apiKey,
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 30,
    }),
  })

  if (!res.ok) return null

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()?.toLowerCase()
  if (!text) return null

  // Clean up and validate
  const cleaned = text
    .split('\n')[0]
    .replace(/["""'''.!?,;:()[\]{}]/g, '')
    .trim()

  const normalized = normalizeVietnamese(cleaned)
  const syllables = normalized.split(/\s+/)
  if (syllables.length < 2) return null
  if (syllables[0] !== normalizeVietnamese(requiredSyllable)) return null
  if (usedWords.has(normalized)) return null

  return normalized
}

// ── AI word validation ──
// Asks Gemini: "Is this a valid Vietnamese compound word?"
async function validateWordWithAI(
  apiKey: string,
  model: string,
  baseUrl: string,
  word: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${PROXY_URL}/api/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl,
        apiKey,
        model,
        messages: [
          {
            role: 'system',
            content: `Bạn là trọng tài trò chơi Nối Từ tiếng Việt. Nhiệm vụ: kiểm tra xem một từ có phải là từ ghép tiếng Việt HỢP LỆ, CÓ NGHĨA hay không.

Trả lời CHỈ "CÓ" hoặc "KHÔNG". Không giải thích.

Ví dụ:
- "học sinh" → CÓ
- "bàn học" → CÓ
- "xyz abc" → KHÔNG
- "tay to" → KHÔNG (không phải từ ghép có nghĩa)
- "mặt trời" → CÓ`,
          },
          {
            role: 'user',
            content: `"${word}" có phải từ ghép tiếng Việt hợp lệ không?`,
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
      }),
    })

    if (!res.ok) return true // If API fails, accept the word

    const data = await res.json()
    const answer = data?.choices?.[0]?.message?.content?.trim()?.toUpperCase() ?? ''

    // Check if answer contains "CÓ" (yes) or "KHÔNG" (no)
    if (answer.includes('KHÔNG') || answer.includes('KO') || answer === 'NO') {
      return false
    }
    return true // Default: accept
  } catch {
    return true // Network error: accept the word
  }
}
