import { useEffect, useState, memo } from 'react'

interface ScoreBoardProps {
  humanScore: number
  botScore: number
  humanLives: number
  botLives: number
}

function ScoreBoardInner({ humanScore, botScore }: ScoreBoardProps) {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-2">
      {/* Human card */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-game-ocean/20 to-game-cyan/20 rounded-2xl min-w-[100px]">
        <span className="text-2xl">👦</span>
        <div>
          <div className="text-[10px] font-bold text-game-ocean uppercase tracking-wider">Bạn</div>
          <AnimatedScore score={humanScore} color="text-game-ocean" />
        </div>
      </div>

      {/* VS */}
      <div className="text-xl font-display font-extrabold text-game-sun animate-wiggle-slow">
        ⚡
      </div>

      {/* Bot card */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-game-coral/20 to-game-pink/20 rounded-2xl min-w-[100px]">
        <span className="text-2xl">🤖</span>
        <div>
          <div className="text-[10px] font-bold text-game-coral uppercase tracking-wider">Bot</div>
          <AnimatedScore score={botScore} color="text-game-coral" />
        </div>
      </div>
    </div>
  )
}

function AnimatedScore({ score, color }: { score: number; color: string }) {
  const [pop, setPop] = useState(false)

  useEffect(() => {
    if (score === 0) return
    setPop(true)
    const t = setTimeout(() => setPop(false), 300)
    return () => clearTimeout(t)
  }, [score])

  return (
    <div
      className={`text-2xl font-display font-extrabold tabular-nums ${color} transition-transform duration-300 ${
        pop ? 'scale-150' : 'scale-100'
      }`}
    >
      {score}
    </div>
  )
}

export const ScoreBoard = memo(ScoreBoardInner)
