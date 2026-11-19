import { memo } from 'react'
import type { PlayedWord } from '../../types/game'
import { getSyllables } from '../../lib/vietnamese'

interface WordBubbleProps {
  word: PlayedWord
  requiredSyllable: string
  onSpeak: (word: string) => void
  isLatest: boolean
}

function WordBubbleInner({ word, requiredSyllable, onSpeak, isLatest }: WordBubbleProps) {
  const isHuman = word.player === 'human'
  const syllables = getSyllables(word.word)

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  return (
    <div
      className={`flex items-end gap-2.5 ${isHuman ? 'justify-start' : 'justify-end'} ${
        isLatest ? 'animate-bounce-in' : ''
      }`}
    >
      {/* Human avatar */}
      {isHuman && (
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-game-ocean to-game-cyan flex items-center justify-center text-xl shadow-ocean">
          👦
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-w-[75%]">
        {/* Bubble */}
        <div
          className={`relative px-5 py-3 shadow-md ${
            isHuman
              ? 'bg-gradient-to-br from-game-ocean to-game-cyan text-white rounded-3xl rounded-bl-lg'
              : 'bg-gradient-to-br from-game-coral to-game-pink text-white rounded-3xl rounded-br-lg'
          }`}
        >
          {/* Word text */}
          <span className="text-xl font-display font-bold leading-snug">
            {syllables.map((syl, i) => {
              const isMatch = i === 0 && requiredSyllable && syl === requiredSyllable
              return (
                <span key={i}>
                  {i > 0 && ' '}
                  <span
                    className={
                      isMatch
                        ? 'bg-white/30 px-1.5 py-0.5 rounded-lg'
                        : ''
                    }
                  >
                    {capitalize(syl)}
                  </span>
                </span>
              )
            })}
          </span>

          {word.wasSpoken && (
            <span className="ml-2 text-sm opacity-60">🎤</span>
          )}
        </div>

        {/* Score + speak row */}
        <div
          className={`flex items-center gap-2 ${
            isHuman ? '' : 'justify-end'
          }`}
        >
          <button
            onClick={() => onSpeak(word.word)}
            className="w-8 h-8 rounded-full bg-game-sun/20 flex items-center justify-center hover:bg-game-sun/40 active:scale-90 transition-all"
            aria-label={`Đọc "${word.word}"`}
          >
            <span className="text-base">🔊</span>
          </button>
          {word.score > 0 && (
            <span className="px-2 py-0.5 bg-game-mint/20 text-game-mint text-sm font-display font-bold rounded-full">
              +{word.score} ⭐
            </span>
          )}
        </div>
      </div>

      {/* Bot avatar */}
      {!isHuman && (
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-game-coral to-game-pink flex items-center justify-center text-xl shadow-fun">
          🤖
        </div>
      )}
    </div>
  )
}

export const WordBubble = memo(WordBubbleInner)
