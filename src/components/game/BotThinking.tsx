import { useState, useEffect } from 'react'

interface BotThinkingProps {
  isThinking: boolean
}

const THINKING_MESSAGES = [
  'Hmm... 🤔',
  'Để mình nghĩ nha!',
  'Khó quá! 😅',
  'Chờ chút nha! ✨',
  'Mình biết rồi! 💡',
  'Từ nào nhỉ... 🧐',
  'Nghĩ ra rồi! 🎉',
  'Dễ ẹc! 😎',
]

export function BotThinking({ isThinking }: BotThinkingProps) {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    if (!isThinking) return
    setMessageIndex(Math.floor(Math.random() * THINKING_MESSAGES.length))
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % THINKING_MESSAGES.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [isThinking])

  if (!isThinking) return null

  const dotColors = ['bg-game-coral', 'bg-game-sun', 'bg-game-mint']

  return (
    <div className="flex items-center justify-end gap-2.5 px-4 py-3 animate-slide-up">
      <div className="bg-gradient-to-r from-game-coral/10 to-game-pink/10 dark:from-game-coral/20 dark:to-game-pink/20 rounded-3xl px-6 py-3 flex items-center gap-3">
        {/* Rainbow bouncing dots */}
        <div className="flex gap-1.5">
          {dotColors.map((color, i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full ${color} animate-bounce`}
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <span className="text-base font-display font-bold text-game-coral">
          {THINKING_MESSAGES[messageIndex]}
        </span>
      </div>
      <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-game-coral to-game-pink flex items-center justify-center text-xl animate-wiggle shadow-fun">
        🤖
      </div>
    </div>
  )
}
