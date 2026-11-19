import { useState } from 'react'
import { useSettings } from '../../App'
import { SettingsModal } from '../settings/SettingsModal'

interface HomeScreenProps {
  onPlay: () => void
}

export function HomeScreen({ onPlay }: HomeScreenProps) {
  const { settings } = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const difficultyLabels = {
    easy: '🐰 Dễ',
    medium: '🦊 Vừa',
    hard: '🐉 Khó',
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen gap-4 p-6 overflow-hidden bg-gradient-kids">
      {/* Floating animated emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[8%] left-[10%] text-4xl animate-float-slow opacity-30">⭐</div>
        <div className="absolute top-[15%] right-[12%] text-3xl animate-float-slow-delay opacity-25">🌈</div>
        <div className="absolute top-[45%] left-[5%] text-3xl animate-float-slow-delay-2 opacity-20">🎵</div>
        <div className="absolute bottom-[25%] right-[8%] text-4xl animate-float-slow-delay-3 opacity-25">💫</div>
        <div className="absolute bottom-[10%] left-[15%] text-3xl animate-float-slow-delay-4 opacity-20">🎈</div>
        <div className="absolute top-[60%] right-[20%] text-3xl animate-float-slow opacity-20">🌟</div>
        <div className="absolute top-[30%] left-[25%] text-2xl animate-float-slow-delay-3 opacity-15">❤️</div>

        {/* Big blurred color blobs */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-game-coral/15 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute top-1/4 -right-20 w-72 h-72 bg-game-ocean/15 rounded-full blur-3xl animate-float-slow-delay" />
        <div className="absolute bottom-1/4 -left-16 w-52 h-52 bg-game-mint/15 rounded-full blur-3xl animate-float-slow-delay-2" />
        <div className="absolute -bottom-16 right-10 w-64 h-64 bg-game-sun/15 rounded-full blur-3xl animate-float-slow-delay-3" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-game-grape/10 rounded-full blur-3xl" />
      </div>

      {/* Settings gear */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="absolute top-4 right-4 w-14 h-14 rounded-full bg-white/70 dark:bg-white/15 backdrop-blur-sm flex items-center justify-center hover:bg-white/90 dark:hover:bg-white/25 transition-all shadow-lg hover:scale-110 active:scale-95 z-10"
        aria-label="Cài đặt"
      >
        <span className="text-2xl">⚙️</span>
      </button>

      {/* Main content */}
      <div className="relative text-center space-y-6 z-10">
        {/* Animated mascot */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-5xl animate-bounce" style={{ animationDelay: '0ms' }}>🎯</span>
          <span className="text-6xl animate-bounce" style={{ animationDelay: '200ms' }}>🔗</span>
          <span className="text-5xl animate-bounce" style={{ animationDelay: '400ms' }}>🎮</span>
        </div>

        {/* Title */}
        <h1 className="font-display font-extrabold tracking-tight">
          <span className="text-7xl sm:text-8xl text-rainbow block">
            Nối Từ
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl font-display font-semibold text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
          Cùng chơi nối từ nào! 🌈
        </p>

        {/* Difficulty badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 px-5 py-2 bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-full text-base font-display font-bold text-gray-700 dark:text-gray-200 shadow-sm">
            {difficultyLabels[settings.difficulty]}
            {settings.geminiEnabled && (
              <span className="ml-1 text-game-grape">✨ AI</span>
            )}
          </span>
        </div>

        {/* GIANT Play button */}
        <button
          onClick={onPlay}
          className="mt-4 px-14 py-5 bg-gradient-to-r from-game-coral to-game-pink text-white text-3xl font-display font-extrabold rounded-full shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 animate-bounce-in"
          style={{ minHeight: '80px' }}
        >
          CHƠI 🎮
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
