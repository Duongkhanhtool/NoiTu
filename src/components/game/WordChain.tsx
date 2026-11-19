import { useEffect, useRef } from 'react'
import type { PlayedWord } from '../../types/game'
import { getLastSyllable } from '../../lib/vietnamese'
import { WordBubble } from './WordBubble'

interface WordChainProps {
  chain: PlayedWord[]
  onSpeakWord: (word: string) => void
}

export function WordChain({ chain, onSpeakWord }: WordChainProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chain.length])

  if (chain.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 dark:text-gray-500 px-6">
        <div className="text-7xl animate-bounce">🔗</div>
        <p className="text-center text-xl font-display font-bold">
          Bắt đầu nối từ nào! 🌟
        </p>
        <p className="text-center text-sm opacity-70">
          Từ tiếp theo phải bắt đầu bằng âm tiết cuối 🎯
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
      {chain.map((playedWord, index) => {
        const prevWord = index > 0 ? chain[index - 1] : null
        const requiredSyllable = prevWord ? getLastSyllable(prevWord.word) : ''

        return (
          <WordBubble
            key={`${playedWord.word}-${index}`}
            word={playedWord}
            requiredSyllable={requiredSyllable}
            onSpeak={onSpeakWord}
            isLatest={index === chain.length - 1}
          />
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
