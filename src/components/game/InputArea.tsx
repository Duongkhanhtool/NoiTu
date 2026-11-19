import { useState, useRef, useEffect, useCallback } from 'react'

interface InputAreaProps {
  onSubmit: (word: string, wasSpoken: boolean) => void
  requiredSyllable: string
  disabled: boolean
  errorMessage: string | null
  sttSupported: boolean
  onMicToggle: () => void
  isListening: boolean
  isMicWarming?: boolean
  interimTranscript: string
}

export function InputArea({
  onSubmit,
  requiredSyllable,
  disabled,
  errorMessage,
  sttSupported,
  onMicToggle,
  isListening,
  isMicWarming = false,
  interimTranscript,
}: InputAreaProps) {
  const [text, setText] = useState('')
  const [shakeError, setShakeError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wasSpokenRef = useRef(false)

  // Auto-focus input when enabled
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus()
    }
  }, [disabled])

  // When mic starts listening, clear the text field so new speech replaces it
  useEffect(() => {
    if (isListening) {
      setText('')
      wasSpokenRef.current = true
    }
  }, [isListening])

  // Update text from STT results (interim and final)
  useEffect(() => {
    if (interimTranscript) {
      setText(interimTranscript)
      wasSpokenRef.current = true
    }
  }, [interimTranscript])

  // Auto-submit when STT finishes (isListening goes false and we have spoken text)
  const prevListening = useRef(false)
  useEffect(() => {
    if (prevListening.current && !isListening && wasSpokenRef.current) {
      const trimmed = text.trim()
      if (trimmed) {
        const t = setTimeout(() => {
          onSubmit(trimmed, true)
          setText('')
          wasSpokenRef.current = false
        }, 300)
        prevListening.current = isListening
        return () => clearTimeout(t)
      }
    }
    prevListening.current = isListening
  }, [isListening, text, onSubmit])

  // Shake animation on error
  useEffect(() => {
    if (errorMessage) {
      setShakeError(true)
      const t = setTimeout(() => setShakeError(false), 500)
      return () => clearTimeout(t)
    }
  }, [errorMessage])

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit(trimmed, wasSpokenRef.current)
    setText('')
    wasSpokenRef.current = false
  }, [text, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  return (
    <div className="px-3 pb-4 pt-1 relative">
      {/* Error message */}
      {errorMessage && (
        <div
          className={`mb-3 px-4 py-3 bg-gradient-to-r from-game-rose/15 to-game-pink/15 text-game-rose font-display font-bold text-base rounded-2xl flex items-center gap-2 ${
            shakeError ? 'animate-shake' : ''
          }`}
        >
          <span className="text-xl flex-shrink-0">😮</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-3">
        {/* Mic button — BIG and colorful */}
        {sttSupported && (
          <button
            onClick={onMicToggle}
            disabled={disabled}
            className={`relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMicWarming
                ? 'bg-gradient-to-br from-game-sun to-game-orange text-white shadow-lg shadow-game-sun/30 animate-pulse'
                : isListening
                  ? 'bg-gradient-to-br from-red-500 to-game-rose text-white shadow-lg shadow-red-500/30 scale-110'
                  : 'bg-gradient-to-br from-game-grape to-game-pink text-white shadow-grape hover:scale-110 active:scale-95'
            } disabled:opacity-40 disabled:scale-100`}
            style={{ minWidth: 56, minHeight: 56 }}
            aria-label={isMicWarming ? 'Đang chuẩn bị...' : isListening ? 'Dừng nghe' : 'Nói'}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-full bg-red-500/50 animate-pulse-ring" />
            )}
            {isMicWarming && (
              <span className="absolute inset-0 rounded-full bg-game-sun/50 animate-pulse-ring" />
            )}
            <span className="relative text-2xl">
              {isMicWarming ? '⏳' : isListening ? '⏹' : '🎤'}
            </span>
          </button>
        )}

        {/* Mic warming indicator */}
        {isMicWarming && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-8 bg-game-sun text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce-in whitespace-nowrap z-10">
            🎤 Sẵn sàng... Nói đi!
          </div>
        )}

        {/* Text input — large and rounded */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              wasSpokenRef.current = false
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              requiredSyllable
                ? `Từ bắt đầu bằng "${requiredSyllable}"...`
                : 'Nhập từ...'
            }
            className="w-full px-5 py-4 text-xl font-display font-semibold bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-game-ocean/20 focus:border-game-ocean/50 disabled:opacity-40 transition-all placeholder:text-gray-400 placeholder:font-normal placeholder:text-base"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {isListening && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400 font-bold">đang nghe</span>
            </span>
          )}
        </div>

        {/* Submit button — BIG and gradient */}
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-game-ocean to-game-cyan text-white flex items-center justify-center hover:scale-110 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shadow-ocean"
          style={{ minWidth: 56, minHeight: 56 }}
          aria-label="Gửi"
        >
          <span className="text-2xl">🚀</span>
        </button>
      </div>
    </div>
  )
}
