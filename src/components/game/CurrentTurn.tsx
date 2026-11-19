import { useMemo } from 'react'
import type { Player } from '../../types/game'

interface CurrentTurnProps {
  currentPlayer: Player
  requiredSyllable: string
  timeLeft: number
  turnTimeLimit: number
}

export function CurrentTurn({
  currentPlayer,
  requiredSyllable,
  timeLeft,
  turnTimeLimit,
}: CurrentTurnProps) {
  const isHuman = currentPlayer === 'human'
  const isWarning = timeLeft <= 5
  const progress = turnTimeLimit > 0 ? (timeLeft / turnTimeLimit) * 100 : 100

  const timerEmoji = useMemo(() => {
    if (timeLeft > 15) return '😊'
    if (timeLeft > 10) return '🤔'
    if (timeLeft > 5) return '😰'
    return '😱'
  }, [timeLeft])

  const timerColor = useMemo(() => {
    if (isWarning) return 'from-red-500 to-game-rose'
    if (timeLeft <= 10) return 'from-game-sun to-game-orange'
    return 'from-game-mint to-game-lime'
  }, [isWarning, timeLeft])

  return (
    <div className="px-4 py-2">
      {/* Turn indicator + timer */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{isHuman ? '👦' : '🤖'}</span>
          <span className="font-display font-bold text-base">
            {isHuman ? 'Lượt của bạn!' : 'Bot đang nghĩ...'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xl">{timerEmoji}</span>
          <span
            className={`font-display font-extrabold text-2xl tabular-nums ${
              isWarning ? 'text-red-500 animate-pulse' : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            {timeLeft}
          </span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-3 bg-gray-200/60 dark:bg-gray-700/40 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear bg-gradient-to-r ${timerColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Required syllable — BIG for kids */}
      {requiredSyllable && isHuman && (
        <div className="flex items-center justify-center">
          <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl ${
            isWarning
              ? 'bg-red-500/10 animate-pulse'
              : 'bg-gradient-to-r from-game-ocean/15 to-game-cyan/15'
          }`}>
            <span className="text-base text-gray-500 dark:text-gray-400 font-medium">
              Nối từ bắt đầu bằng
            </span>
            <span className="text-3xl font-display font-extrabold text-game-ocean animate-bounce-in">
              "{requiredSyllable}"
            </span>
            <span className="text-xl">🎯</span>
          </div>
        </div>
      )}
    </div>
  )
}
