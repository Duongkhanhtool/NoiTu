import { useState, createContext, useContext, useCallback } from 'react'
import { HomeScreen } from './components/screens/HomeScreen'
import { GameScreen } from './components/screens/GameScreen'
import { ResultScreen } from './components/screens/ResultScreen'

// --- Types ---
export type Screen = 'home' | 'game' | 'result'

export interface Settings {
  geminiEnabled: boolean
  difficulty: 'easy' | 'medium' | 'hard'
  turnTimeLimit: number
  ttsEnabled: boolean
  ttsRate: number
  ttsSource: 'google' | 'browser'
  soundEnabled: boolean
  showHints: boolean
  humanLives: number
  botLives: number
}

const DEFAULT_SETTINGS: Settings = {
  geminiEnabled: false,
  difficulty: 'easy',
  turnTimeLimit: 30,
  ttsEnabled: true,
  ttsRate: 0.8,
  ttsSource: 'google',
  soundEnabled: true,
  showHints: true,
  humanLives: 3,
  botLives: 3,
}

// --- Settings Context ---
interface SettingsContextValue {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
})

export function useSettings() {
  return useContext(SettingsContext)
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('noitu-settings')
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem('noitu-settings', JSON.stringify(settings))
  } catch { /* ignore */ }
}

// --- App ---
export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [lastScore, setLastScore] = useState({ human: 0, bot: 0, chainLength: 0 })

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const goToGame = useCallback(() => setScreen('game'), [])
  const goToHome = useCallback(() => setScreen('home'), [])
  const goToResult = useCallback((human: number, bot: number, chainLength: number) => {
    setLastScore({ human, bot, chainLength })
    setScreen('result')
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      <div className="min-h-screen text-gray-900 dark:text-gray-100 transition-colors">
        {screen === 'home' && <HomeScreen onPlay={goToGame} />}
        {screen === 'game' && <GameScreen onFinish={goToResult} onHome={goToHome} />}
        {screen === 'result' && (
          <ResultScreen
            humanScore={lastScore.human}
            botScore={lastScore.bot}
            chainLength={lastScore.chainLength}
            onPlayAgain={goToGame}
            onHome={goToHome}
          />
        )}
      </div>
    </SettingsContext.Provider>
  )
}
