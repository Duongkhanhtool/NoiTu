interface ResultScreenProps {
  humanScore: number
  botScore: number
  chainLength: number
  onPlayAgain: () => void
  onHome: () => void
}

export function ResultScreen({
  humanScore,
  botScore,
  chainLength,
  onPlayAgain,
  onHome,
}: ResultScreenProps) {
  const won = humanScore > botScore
  const tied = humanScore === botScore

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen gap-5 p-6 overflow-hidden bg-gradient-kids">
      {/* Floating celebration emojis for wins */}
      {won && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {['⭐', '🌟', '🎉', '✨', '💫', '🎊', '🏆', '🌈'].map((emoji, i) => (
            <span
              key={i}
              className="absolute text-3xl animate-confetti"
              style={{
                left: `${10 + i * 11}%`,
                animationDelay: `${i * 0.15}s`,
                animationDuration: `${2 + Math.random()}s`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}

      {/* Result emoji */}
      <div className="text-8xl animate-bounce-in">
        {tied ? '🤝' : won ? '🏆' : '💪'}
      </div>

      {/* Result text */}
      <h2 className="text-4xl sm:text-5xl font-display font-extrabold text-center">
        {tied ? (
          <span className="text-game-sun">Hòa rồi!</span>
        ) : won ? (
          <span className="text-rainbow">GIỎI QUÁ!</span>
        ) : (
          <span className="text-game-ocean">Cố lên nhé! 😊</span>
        )}
      </h2>

      {/* Score comparison */}
      <div className="flex gap-4 items-center w-full max-w-xs">
        {/* Human card */}
        <div className={`flex-1 rounded-3xl p-4 text-center shadow-lg ${
          won ? 'bg-gradient-to-b from-game-ocean to-game-cyan ring-4 ring-game-sun/50' : 'bg-gradient-to-b from-game-ocean to-game-cyan'
        }`}>
          <div className="text-3xl mb-1">👦</div>
          <div className="text-sm font-bold text-white/80">Bạn</div>
          <div className="text-4xl font-display font-extrabold text-white tabular-nums mt-1">
            {humanScore}
          </div>
          {won && <div className="text-lg mt-1">👑</div>}
        </div>

        {/* VS */}
        <div className="text-2xl font-display font-extrabold text-game-sun animate-wiggle-slow">
          ⚡
        </div>

        {/* Bot card */}
        <div className={`flex-1 rounded-3xl p-4 text-center shadow-lg ${
          !won && !tied ? 'bg-gradient-to-b from-game-coral to-game-pink ring-4 ring-game-sun/50' : 'bg-gradient-to-b from-game-coral to-game-pink'
        }`}>
          <div className="text-3xl mb-1">🤖</div>
          <div className="text-sm font-bold text-white/80">Bot</div>
          <div className="text-4xl font-display font-extrabold text-white tabular-nums mt-1">
            {botScore}
          </div>
          {!won && !tied && <div className="text-lg mt-1">👑</div>}
        </div>
      </div>

      {/* Chain length */}
      <div className="flex items-center gap-2 px-5 py-3 bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-full shadow-sm">
        <span className="text-xl">🔗</span>
        <span className="text-base font-display font-bold text-gray-700 dark:text-gray-200">
          Chuỗi từ: <span className="text-game-grape text-xl">{chainLength}</span> từ
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 mt-2 w-full max-w-xs">
        <button
          onClick={onPlayAgain}
          className="w-full px-8 py-5 bg-gradient-to-r from-game-coral to-game-pink text-white font-display font-extrabold text-2xl rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          Chơi Lại 🎮
        </button>
        <button
          onClick={onHome}
          className="w-full px-6 py-4 bg-white/80 dark:bg-white/10 backdrop-blur-sm font-display font-bold text-lg text-gray-700 dark:text-gray-200 rounded-full shadow-sm hover:bg-white dark:hover:bg-white/20 active:scale-95 transition-all"
        >
          🏠 Trang Chủ
        </button>
      </div>
    </div>
  )
}
