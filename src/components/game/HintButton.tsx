import { useState, useCallback } from 'react'
import { DICTIONARY_INDEX } from '../../data/dictionary-index'
import { normalizeVietnamese } from '../../lib/vietnamese'

interface HintButtonProps {
  requiredSyllable: string
  usedWords: Set<string>
  visible: boolean
}

export function HintButton({ requiredSyllable, usedWords, visible }: HintButtonProps) {
  const [hints, setHints] = useState<string[]>([])
  const [showing, setShowing] = useState(false)

  const showHints = useCallback(() => {
    if (showing) {
      setShowing(false)
      setHints([])
      return
    }

    const normalizedSyllable = normalizeVietnamese(requiredSyllable)
    const available = DICTIONARY_INDEX.get(normalizedSyllable) ?? []
    const unused = available.filter((w) => !usedWords.has(normalizeVietnamese(w)))

    const shuffled = [...unused].sort(() => Math.random() - 0.5)
    setHints(shuffled.slice(0, 3))
    setShowing(true)
  }, [requiredSyllable, usedWords, showing])

  if (!visible) return null

  return (
    <div className="px-4 pb-2">
      <button
        onClick={showHints}
        className="flex items-center gap-1.5 px-4 py-2.5 bg-game-sun/15 hover:bg-game-sun/25 rounded-full font-display font-bold text-game-sun text-base transition-all active:scale-95"
      >
        <span className={`text-xl ${showing ? '' : 'animate-wiggle-slow'}`}>💡</span>
        <span>{showing ? 'Ẩn gợi ý' : 'Gợi ý'}</span>
      </button>

      {showing && hints.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 animate-slide-up">
          {hints.map((hint) => (
            <span
              key={hint}
              className="inline-block px-4 py-2 bg-gradient-to-r from-game-sun/20 to-game-orange/20 text-game-orange text-base font-display font-bold rounded-full shadow-sm"
            >
              ✨ {hint}
            </span>
          ))}
        </div>
      )}

      {showing && hints.length === 0 && (
        <p className="text-sm text-gray-400 font-display mt-2 animate-slide-up">
          Không tìm thấy gợi ý nào 🤷
        </p>
      )}
    </div>
  )
}
